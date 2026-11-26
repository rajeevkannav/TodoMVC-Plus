import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export default function App() {
    const [todos, setTodos] = useState([]);
    const [input, setInput] = useState('');
    return (_jsxs("main", { children: [_jsx("h1", { children: "Todos" }), _jsxs("form", { onSubmit: (e) => { e.preventDefault(); setTodos([...todos, { id: Date.now(), text: input, completed: false }]); setInput(''); }, children: [_jsx("input", { "aria-label": "New todo", value: input, onChange: e => setInput(e.target.value) }), _jsx("button", { type: "submit", children: "Add" })] }), _jsx("ul", { role: "list", children: todos.map(t => _jsx("li", { children: t.text }, t.id)) })] }));
}
