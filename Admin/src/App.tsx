import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import RequireAuth from './components/RequireAuth';
import Dashboard from './components/Dashboard';
import UserManagement from './components/UserManagement';
import TemplateLibrary from './components/TemplateLibrary';
import CategoryManager from './components/CategoryManager';
import AddTemplate from './components/AddTemplate';
import NotificationsManager from './components/NotificationsManager';
import HomeCarouselManager from './components/HomeCarouselManager';
import PoliticalPartiesAdmin from './components/PoliticalPartiesAdmin';
import SuggestionsManager from './components/SuggestionsManager';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/templates" element={<TemplateLibrary />} />
          <Route path="/templates/categories" element={<CategoryManager />} />
          <Route path="/templates/new" element={<AddTemplate />} />
          <Route path="/notifications" element={<NotificationsManager />} />
          <Route path="/home-carousel" element={<HomeCarouselManager />} />
          <Route path="/political-parties" element={<PoliticalPartiesAdmin />} />
          <Route path="/suggestions" element={<SuggestionsManager />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
