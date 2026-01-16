#!/usr/bin/env python3
"""Test script for transcription providers"""
import asyncio
import sys
from pathlib import Path

# Add the parent directory to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.transcription.gemini import get_gemini_provider
from app.services.transcription.openai import get_openai_provider
from app.services.transcription import get_provider, ProviderRegistry


async def test_provider(provider_name: str, audio_path: str, model: str = None):
    """Test a transcription provider"""
    print(f"\n{'='*60}")
    print(f"Testing {provider_name.upper()} provider" + (f" with model: {model}" if model else ""))
    print('='*60)
    
    # Read audio file
    with open(audio_path, "rb") as f:
        audio_bytes = f.read()
    
    print(f"Audio file size: {len(audio_bytes):,} bytes")
    
    # Get provider
    provider = get_provider(provider_name)
    print(f"Provider: {provider.name}")
    print(f"Supported models: {provider.supported_models}")
    print(f"Default model: {provider.default_model}")
    
    # Transcribe
    print("\nTranscribing...")
    result = await provider.transcribe(
        audio_bytes=audio_bytes,
        audio_format="mp3",
        model=model,
        language="en",
        noisy_room=False,
    )
    
    print(f"\n--- Result ---")
    print(f"Provider: {result.provider}")
    print(f"Model: {result.model}")
    print(f"Latency: {result.latency_ms}ms")
    print(f"Transcript: {result.text[:200]}..." if len(result.text) > 200 else f"Transcript: {result.text}")
    
    return result


async def main():
    audio_path = Path(__file__).parent.parent / "ElevenLabs_Text_to_Speech_audio.mp3"
    
    if not audio_path.exists():
        print(f"Error: Audio file not found at {audio_path}")
        return
    
    print(f"Using audio file: {audio_path}")
    
    # Show registered providers
    print("\n" + "="*60)
    print("Registered Providers")
    print("="*60)
    provider_info = ProviderRegistry.get_provider_info()
    for name, info in provider_info.items():
        print(f"  - {name}: {info['supported_models']}")
    
    # Test Gemini
    try:
        await test_provider("gemini", str(audio_path))
    except Exception as e:
        print(f"Gemini test failed: {e}")
    
    # Test OpenAI with default model (gpt-4o-mini-transcribe)
    try:
        await test_provider("openai", str(audio_path))
    except Exception as e:
        print(f"OpenAI test failed: {e}")
    
    # Test OpenAI with gpt-4o-transcribe
    try:
        await test_provider("openai", str(audio_path), model="gpt-4o-transcribe")
    except Exception as e:
        print(f"OpenAI (gpt-4o-transcribe) test failed: {e}")
    
    print("\n" + "="*60)
    print("All tests completed!")
    print("="*60)


if __name__ == "__main__":
    asyncio.run(main())
