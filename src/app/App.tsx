import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { queryClient } from '../api/queryClient';
import LeadApp from './LeadApp';
import ConfirmPage from '../pages/confirm/ConfirmPage';

export default function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
				<Routes>
					<Route path="/" element={<Navigate to="/app" replace />} />
					<Route path="/app/*" element={<LeadApp />} />
					<Route path="/c/:token" element={<ConfirmPage />} />
				</Routes>
			</BrowserRouter>
		</QueryClientProvider>
	);
}
