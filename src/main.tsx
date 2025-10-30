import React from "react";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "./components/error-boundary.tsx";
import VideoEditor from "./pages/video-editor.tsx";
import { Provider } from "./provider.tsx";
import "@/styles/globals.css";

const root = document.getElementById("root") as HTMLElement;

if (!root) {
	throw new Error("Root element not found");
}

ReactDOM.createRoot(root).render(
	<React.StrictMode>
		<Provider>
			<ErrorBoundary>
				<VideoEditor />
			</ErrorBoundary>
		</Provider>
	</React.StrictMode>,
);
