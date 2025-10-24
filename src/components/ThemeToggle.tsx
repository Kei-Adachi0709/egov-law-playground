import { Button } from './Button';
import { useThemeStore, type Theme, type ThemeState } from '../store/themeStore';

export const ThemeToggle = () => {
  const theme = useThemeStore((state: ThemeState) => state.theme) as Theme;
  const toggleTheme = useThemeStore((state: ThemeState) => state.toggleTheme);
  const labels: Record<Theme, string> = {
    light: 'ライトモード',
    dark: 'ダークモード'
  };

  return (
    <Button variant="ghost" onClick={toggleTheme} aria-label={`現在: ${labels[theme]}`}>
      <span className="text-sm font-medium">{labels[theme]}</span>
    </Button>
  );
};
