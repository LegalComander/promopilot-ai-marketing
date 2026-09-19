(() => {
  const cfg = window.PROMOPILOT_SUPABASE || {};
  if (!cfg.url || !cfg.anonKey || !window.supabase) return;

  const sb = window.supabase.createClient(cfg.url, cfg.anonKey);
  const LIVE_URL = window.location.origin;
  const $ = (id) => document.getElementById(id);
  const clean = (value) => (value || '').trim().replace(/\s+/g, ' ');
  const modal = (id, on = true) => $(id)?.classList.toggle('hidden', !on);

  function message(id, text, ok = false) {
    const el = $(id);
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('hidden', !text);
    el.classList.toggle('success', ok);
    el.classList.toggle('error', !ok);
  }

  async function requestPasswordReset() {
    const email = clean($('lEmail')?.value).toLowerCase();
    message('loginError', '');
    message('loginNotice', '');
    if (!email) {
      message('loginError', 'Enter your email address first, then press Forgot password.');
      $('lEmail')?.focus();
      return;
    }

    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${LIVE_URL}/`
    });

    if (error) {
      message('loginError', error.message);
      return;
    }

    message('loginNotice', 'Password reset email sent. Check your inbox and spam folder.', true);
  }

  async function resendConfirmation() {
    const email = clean($('lEmail')?.value).toLowerCase();
    message('loginError', '');
    message('loginNotice', '');
    if (!email) {
      message('loginError', 'Enter your email address first, then press Resend confirmation email.');
      $('lEmail')?.focus();
      return;
    }

    const { error } = await sb.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${LIVE_URL}/` }
    });

    if (error) {
      message('loginError', error.message);
      return;
    }

    message('loginNotice', 'Confirmation email sent. Check your inbox and spam folder.', true);
  }

  $('forgotPassword')?.addEventListener('click', requestPasswordReset);
  $('resendConfirmation')?.addEventListener('click', resendConfirmation);

  const resetForm = $('resetForm');
  if (resetForm) {
    resetForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      message('resetError', '');
      message('resetNotice', '');

      const password = $('newPassword').value;
      const confirmPassword = $('confirmPassword').value;

      if (password.length < 8) {
        message('resetError', 'Use at least 8 characters for your new password.');
        return;
      }
      if (password !== confirmPassword) {
        message('resetError', 'The two passwords do not match.');
        return;
      }

      const { error } = await sb.auth.updateUser({ password });
      if (error) {
        message('resetError', error.message);
        return;
      }

      message('resetNotice', 'Password updated successfully. You can now sign in with your new password.', true);
      $('newPassword').value = '';
      $('confirmPassword').value = '';

      setTimeout(async () => {
        await sb.auth.signOut();
        modal('resetModal', false);
        modal('loginModal', true);
        message('loginNotice', 'Password changed successfully. Sign in with your new password.', true);
      }, 900);
    });
  }

  const signupForm = $('signupForm');
  if (signupForm) {
    signupForm.onsubmit = async (event) => {
      event.preventDefault();
      message('signupError', '');

      const payload = {
        name: clean($('rName').value),
        email: clean($('rEmail').value).toLowerCase(),
        password: $('rPassword').value,
        business: clean($('rBusiness').value),
        type: clean($('rType').value),
        location: clean($('rLocation').value),
        consent: $('consent').checked
      };

      if (payload.password.length < 8) {
        message('signupError', 'Use at least 8 characters for your password.');
        return;
      }

      const { data, error } = await sb.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          emailRedirectTo: `${LIVE_URL}/`,
          data: {
            full_name: payload.name,
            business_name: payload.business,
            business_type: payload.type,
            location: payload.location,
            marketing_consent: payload.consent
          }
        }
      });

      if (error) {
        message('signupError', error.message);
        return;
      }

      $('rPassword').value = '';
      modal('signupModal', false);

      if (!data.session) {
        $('lEmail').value = payload.email;
        modal('loginModal', true);
        message('loginNotice', 'Account created. Check your email to confirm it. If needed, use “Resend confirmation email” below.', true);
        return;
      }

      window.location.reload();
    };
  }

  sb.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      modal('loginModal', false);
      modal('resetModal', true);
    }
  });
})();
