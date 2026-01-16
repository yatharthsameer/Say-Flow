"""OpenAI Realtime API WebSocket proxy for streaming transcription"""
import asyncio
import base64
import json
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import websockets
from websockets.exceptions import ConnectionClosed

from app.core.config import get_settings
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)

# OpenAI Realtime API endpoint
OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime"

# Realtime API requires a realtime model for the connection
# The transcription model is configured separately in session.update
DEFAULT_REALTIME_MODEL = "gpt-4o-mini-realtime-preview"

# Mapping from user-facing model names to realtime connection models
REALTIME_CONNECTION_MODELS = {
    "gpt-4o-mini-transcribe": "gpt-4o-mini-realtime-preview",
    "gpt-4o-transcribe": "gpt-4o-realtime-preview",
    # Direct realtime models
    "gpt-4o-mini-realtime-preview": "gpt-4o-mini-realtime-preview",
    "gpt-4o-realtime-preview": "gpt-4o-realtime-preview",
}


class RealtimeTranscriptionSession:
    """Manages a realtime transcription session between client and OpenAI"""
    
    def __init__(
        self,
        client_ws: WebSocket,
        model: str = DEFAULT_REALTIME_MODEL,
        language: str = "en",
    ):
        self.client_ws = client_ws
        self.model = model
        self.language = language
        self.openai_ws: Optional[websockets.WebSocketClientProtocol] = None
        self.is_running = False
        self.accumulated_transcript = ""
        
    async def connect_to_openai(self) -> bool:
        """Establish connection to OpenAI Realtime API"""
        settings = get_settings()
        
        if not settings.openai_api_key:
            logger.error("OpenAI API key not configured")
            return False
        
        try:
            # Map the user-selected model to the realtime connection model
            connection_model = REALTIME_CONNECTION_MODELS.get(
                self.model, 
                DEFAULT_REALTIME_MODEL
            )
            
            # Connect to OpenAI Realtime API
            url = f"{OPENAI_REALTIME_URL}?model={connection_model}"
            headers = {
                "Authorization": f"Bearer {settings.openai_api_key}",
                "OpenAI-Beta": "realtime=v1",
            }
            
            logger.info(f"Connecting to OpenAI Realtime API", {
                "user_model": self.model,
                "connection_model": connection_model,
            })
            
            self.openai_ws = await websockets.connect(
                url,
                additional_headers=headers,
                ping_interval=30,
                ping_timeout=10,
            )
            
            logger.info(f"Connected to OpenAI Realtime API with model {connection_model}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to OpenAI Realtime API: {e}")
            return False
    
    async def configure_session(self):
        """Send session configuration to OpenAI"""
        if not self.openai_ws:
            return
        
        # Configure for transcription-only mode
        config = {
            "type": "session.update",
            "session": {
                "modalities": ["text"],
                "input_audio_format": "pcm16",
                "input_audio_transcription": {
                    "model": "whisper-1",  # Transcription model
                },
                "turn_detection": {
                    "type": "server_vad",
                    "threshold": 0.5,
                    "prefix_padding_ms": 300,
                    "silence_duration_ms": 500,
                },
            }
        }
        
        await self.openai_ws.send(json.dumps(config))
        logger.debug("Sent session configuration to OpenAI")
    
    async def handle_client_messages(self):
        """Receive messages from client and forward to OpenAI"""
        try:
            async for message in self.client_ws.iter_text():
                if not self.is_running:
                    break
                    
                try:
                    data = json.loads(message)
                    msg_type = data.get("type")
                    
                    if msg_type == "audio_chunk":
                        # Forward audio chunk to OpenAI
                        audio_data = data.get("data", "")
                        await self.send_audio_to_openai(audio_data)
                        
                    elif msg_type == "commit":
                        # Signal end of audio input
                        await self.commit_audio()
                        
                    elif msg_type == "cancel":
                        # Cancel the current transcription
                        await self.cancel_transcription()
                        break
                        
                except json.JSONDecodeError:
                    logger.warning("Received invalid JSON from client")
                    
        except WebSocketDisconnect:
            logger.info("Client disconnected")
        except Exception as e:
            logger.error(f"Error handling client messages: {e}")
        finally:
            self.is_running = False
    
    async def handle_openai_messages(self):
        """Receive messages from OpenAI and forward to client"""
        if not self.openai_ws:
            return
            
        try:
            async for message in self.openai_ws:
                if not self.is_running:
                    break
                    
                try:
                    event = json.loads(message)
                    event_type = event.get("type", "")
                    
                    # Log all events for debugging
                    logger.debug(f"OpenAI event: {event_type}")
                    
                    if event_type == "session.created":
                        logger.info("OpenAI session created")
                        await self.configure_session()
                        
                    elif event_type == "session.updated":
                        logger.info("OpenAI session configured")
                        await self.client_ws.send_json({
                            "type": "session_ready"
                        })
                        
                    elif event_type == "conversation.item.input_audio_transcription.delta":
                        # Partial transcription
                        delta = event.get("delta", "")
                        if delta:
                            self.accumulated_transcript += delta
                            await self.client_ws.send_json({
                                "type": "transcript_delta",
                                "delta": delta,
                                "transcript": self.accumulated_transcript,
                            })
                            
                    elif event_type == "conversation.item.input_audio_transcription.completed":
                        # Final transcription for this segment
                        transcript = event.get("transcript", "")
                        await self.client_ws.send_json({
                            "type": "transcript_completed",
                            "transcript": transcript,
                        })
                        
                    elif event_type == "input_audio_buffer.speech_started":
                        await self.client_ws.send_json({
                            "type": "speech_started"
                        })
                        
                    elif event_type == "input_audio_buffer.speech_stopped":
                        await self.client_ws.send_json({
                            "type": "speech_stopped"
                        })
                        
                    elif event_type == "input_audio_buffer.committed":
                        await self.client_ws.send_json({
                            "type": "audio_committed"
                        })
                        
                    elif event_type == "response.done":
                        # Response complete - send final transcript
                        await self.client_ws.send_json({
                            "type": "transcript_final",
                            "transcript": self.accumulated_transcript,
                        })
                        
                    elif event_type == "error":
                        error = event.get("error", {})
                        logger.error(f"OpenAI error: {error}")
                        await self.client_ws.send_json({
                            "type": "error",
                            "error": error.get("message", "Unknown error"),
                        })
                        
                except json.JSONDecodeError:
                    logger.warning("Received invalid JSON from OpenAI")
                    
        except ConnectionClosed:
            logger.info("OpenAI connection closed")
        except Exception as e:
            logger.error(f"Error handling OpenAI messages: {e}")
        finally:
            self.is_running = False
    
    async def send_audio_to_openai(self, audio_base64: str):
        """Send audio chunk to OpenAI"""
        if not self.openai_ws:
            return
            
        try:
            await self.openai_ws.send(json.dumps({
                "type": "input_audio_buffer.append",
                "audio": audio_base64,
            }))
        except Exception as e:
            logger.error(f"Error sending audio to OpenAI: {e}")
    
    async def commit_audio(self):
        """Commit the audio buffer to signal end of input"""
        if not self.openai_ws:
            return
            
        try:
            await self.openai_ws.send(json.dumps({
                "type": "input_audio_buffer.commit",
            }))
            logger.debug("Audio buffer committed")
        except Exception as e:
            logger.error(f"Error committing audio: {e}")
    
    async def cancel_transcription(self):
        """Cancel the current transcription"""
        if not self.openai_ws:
            return
            
        try:
            await self.openai_ws.send(json.dumps({
                "type": "input_audio_buffer.clear",
            }))
            logger.debug("Transcription cancelled")
        except Exception as e:
            logger.error(f"Error cancelling transcription: {e}")
    
    async def run(self):
        """Run the bidirectional proxy"""
        self.is_running = True
        
        # Connect to OpenAI
        if not await self.connect_to_openai():
            await self.client_ws.send_json({
                "type": "error",
                "error": "Failed to connect to OpenAI Realtime API",
            })
            return
        
        try:
            # Run both message handlers concurrently
            await asyncio.gather(
                self.handle_client_messages(),
                self.handle_openai_messages(),
            )
        finally:
            await self.cleanup()
    
    async def cleanup(self):
        """Clean up connections"""
        self.is_running = False
        
        if self.openai_ws:
            try:
                await self.openai_ws.close()
            except Exception:
                pass
            self.openai_ws = None


@router.websocket("/realtime/transcribe")
async def realtime_transcribe(
    websocket: WebSocket,
    model: str = Query(default=DEFAULT_REALTIME_MODEL),
    language: str = Query(default="en"),
):
    """
    WebSocket endpoint for realtime audio transcription.
    
    Proxies audio to OpenAI Realtime API and streams transcription back.
    
    Client Protocol:
    - Send: {"type": "audio_chunk", "data": "<base64 PCM audio>"}
    - Send: {"type": "commit"} when done speaking
    - Send: {"type": "cancel"} to cancel
    
    Server Protocol:
    - Receive: {"type": "session_ready"}
    - Receive: {"type": "transcript_delta", "delta": "...", "transcript": "..."}
    - Receive: {"type": "transcript_completed", "transcript": "..."}
    - Receive: {"type": "transcript_final", "transcript": "..."}
    - Receive: {"type": "error", "error": "..."}
    """
    await websocket.accept()
    logger.info(f"Realtime transcription WebSocket connected (model={model})")
    
    # TODO: Add authentication check here
    # For now, we accept all connections
    
    session = RealtimeTranscriptionSession(
        client_ws=websocket,
        model=model,
        language=language,
    )
    
    try:
        await session.run()
    except WebSocketDisconnect:
        logger.info("Client disconnected from realtime transcription")
    except Exception as e:
        logger.error(f"Realtime transcription error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "error": str(e),
            })
        except Exception:
            pass
    finally:
        await session.cleanup()
        logger.info("Realtime transcription session ended")
