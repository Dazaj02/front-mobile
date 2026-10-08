import { screen } from '@testing-library/react-native';

import { flattenStyle, renderWithTheme } from '../../design-system/testUtils';
import { semanticTokens } from '../../design-system/tokens';
import { es } from '../../i18n/es';
import { useSettingsStore } from '../../state/settingsStore';
import { AuthBrand } from './AuthBrand';

describe('AuthBrand', () => {
  afterEach(() => useSettingsStore.setState({ theme: 'paper' }));

  it.each(['paper', 'sepia', 'dark'] as const)('la marca se tiñe con el acento del tema %s', async (theme) => {
    useSettingsStore.setState({ theme });
    await renderWithTheme(<AuthBrand />);
    expect(screen.getByText(es.appName)).toBeTruthy();
    const style = flattenStyle(screen.getByTestId('brand-mark', { includeHiddenElements: true }).props.style);
    expect(style.tintColor).toBe(semanticTokens[theme].accent.default);
  });
});
