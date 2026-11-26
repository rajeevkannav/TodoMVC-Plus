import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import App from './App';
test('renders todo header', () => {
    render(_jsx(App, {}));
    expect(screen.getByText('Todos')).toBeDefined();
});
