import React from 'react';
import { Routes, Route, useOutletContext } from 'react-router-dom';
import { Shell } from './layout/Shell';
import { HomePage } from '../pages/Home/HomePage';
import { SettingsPage } from '../pages/Settings/SettingsPage';

interface AppRoutesProps {
  onSignOut: () => void;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({ onSignOut }) => {
  return (
    <Routes>
      <Route path="/" element={<Shell onSignOut={onSignOut} />}>
        <Route index element={<HomePage />} />
        <Route path="settings" element={<SettingsPageWrapper />} />
      </Route>
    </Routes>
  );
};

// Wrapper to pass onSignOut from outlet context
const SettingsPageWrapper: React.FC = () => {
  const { onSignOut } = useOutletContext<{ onSignOut: () => void }>();
  return <SettingsPage onSignOut={onSignOut} />;
};
