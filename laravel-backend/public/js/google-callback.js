(() => {
  const message = document.getElementById('callback-message');
  const fail = () => {
    message.textContent = 'This sign-in link is invalid. Return to ByaHero and try Google sign-in again.';
  };
  try {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const state = fragment.get('state') || query.get('state') || '';
    const token = fragment.get('id_token');
    const error = fragment.get('error') || query.get('error');

    // Remove credentials from browser history before leaving the callback page.
    window.history.replaceState(null, '', window.location.pathname);

    // Never send Google credentials to an arbitrary URL supplied through state.
    // Production mobile builds use Linking.createURL('/') with this app scheme.
    if (!/^byaheromobile:\/\/\/?$/.test(state) || (token && token.length > 12000)) {
      fail();
      return;
    }
    if (!token && !error) {
      fail();
      return;
    }
    const result = token
      ? new URLSearchParams({ id_token: token })
      : new URLSearchParams({ error: error.slice(0, 200) });
    window.location.replace(`${state}?${result.toString()}`);
  } catch {
    fail();
  }
})();
