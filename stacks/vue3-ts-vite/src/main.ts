import { createApp } from 'vue';
import App from './App.vue';
import { applyTheme, loadTheme } from './storage';
import './styles.css';

// Apply the remembered theme before first render to avoid a flash.
applyTheme(loadTheme());

createApp(App).mount('#app');
