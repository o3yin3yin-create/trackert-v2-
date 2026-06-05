import React from 'react';
import { renderToString } from 'react-dom/server';
import FriendsPanel from './components/FriendsPanel';

console.log("Compiling...");
try {
  const html = renderToString(<FriendsPanel onClose={() => {}} />);
  console.log("Success! Rendered HTML length:", html.length);
} catch (e) {
  console.error("Runtime Error:", e);
}
