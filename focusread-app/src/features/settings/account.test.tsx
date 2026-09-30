import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { AppError } from '../../lib/errors';
import { es } from '../../i18n/es';
import { clearUserData } from '../../services/session/clearLocalData';
import { useSessionStore } from '../../state/sessionStore';
import { createTestContainer, renderScreen, type TestContainer } from '../../test/testContainer';
import { AccountScreen } from './AccountScreen';

let mockC: TestContainer;
jest.mock('../../data/container', () => ({ getContainer: () => mockC }));
jest.mock('../../services/session/clearLocalData', () => ({ clearUserData: jest.fn(async () => {}) }));

const order: string[] = [];
const renderAccount = () => renderScreen('Account', AccountScreen);
const openPanel = async () => fireEvent.press(await screen.findByRole('button', { name: es.account.deleteStart }));
const confirmBtn = () => screen.getByRole('button', { name: es.account.deleteConfirm });

beforeEach(async () => {
  jest.clearAllMocks();
  order.length = 0;
  mockC = await createTestContainer();
  (mockC.auth.deleteAccount as jest.Mock).mockImplementation(async () => void order.push('servidor'));
  (clearUserData as jest.Mock).mockImplementation(async () => void order.push('local'));
  useSessionStore.setState({ status: 'signedIn', session: { userId: 'u', email: 'ana@correo.com' } });
});

describe('Cuenta › eliminar cuenta', () => {
  it('muestra el correo y advierte que no se puede deshacer', async () => {
    await renderAccount();
    expect(await screen.findByText('ana@correo.com')).toBeTruthy();
    expect(screen.getByText(es.account.deleteWarning)).toBeTruthy();
  });

  it('doble confirmación: primero se abre el panel, luego hay que escribir ELIMINAR exacto', async () => {
    await renderAccount();
    expect(screen.queryByLabelText(es.account.deleteConfirmLabel)).toBeNull(); // paso 1: aún no hay campo
    await openPanel();

    expect(confirmBtn().props.accessibilityState).toMatchObject({ disabled: true });
    for (const wrong of ['eliminar', 'ELIMINA', 'ELIMINAR ', 'Eliminar', '']) {
      await fireEvent.changeText(screen.getByLabelText(es.account.deleteConfirmLabel), wrong);
      expect(confirmBtn().props.accessibilityState).toMatchObject({ disabled: true });
    }
    await fireEvent.changeText(screen.getByLabelText(es.account.deleteConfirmLabel), 'ELIMINAR');
    expect(confirmBtn().props.accessibilityState).toMatchObject({ disabled: false });
    expect(mockC.auth.deleteAccount).not.toHaveBeenCalled();
  });

  it('confirmar elimina primero en el servidor y después borra los datos locales y las keys', async () => {
    await renderAccount();
    await openPanel();
    await fireEvent.changeText(screen.getByLabelText(es.account.deleteConfirmLabel), 'ELIMINAR');
    await fireEvent.press(confirmBtn());
    await waitFor(() => expect(clearUserData).toHaveBeenCalledTimes(1));
    expect(mockC.auth.deleteAccount).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['servidor', 'local']);
  });

  it('si el servidor falla NO se borra nada local y se muestra el error', async () => {
    (mockC.auth.deleteAccount as jest.Mock).mockRejectedValueOnce(new AppError('NETWORK_ERROR', 'x'));
    await renderAccount();
    await openPanel();
    await fireEvent.changeText(screen.getByLabelText(es.account.deleteConfirmLabel), 'ELIMINAR');
    await fireEvent.press(confirmBtn());
    expect(await screen.findByText(new RegExp(es.errors.NETWORK_ERROR))).toBeTruthy();
    expect(clearUserData).not.toHaveBeenCalled();
    expect(confirmBtn().props.accessibilityState).toMatchObject({ disabled: false }); // se puede reintentar
  });

  it('cancelar cierra el panel y limpia lo escrito', async () => {
    await renderAccount();
    await openPanel();
    await fireEvent.changeText(screen.getByLabelText(es.account.deleteConfirmLabel), 'ELIMINAR');
    await fireEvent.press(screen.getByRole('button', { name: es.account.deleteCancel }));
    expect(screen.queryByLabelText(es.account.deleteConfirmLabel)).toBeNull();
    await openPanel();
    expect(screen.getByLabelText(es.account.deleteConfirmLabel).props.value).toBe('');
    expect(mockC.auth.deleteAccount).not.toHaveBeenCalled();
  });
});
