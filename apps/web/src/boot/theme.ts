import { boot } from 'quasar/wrappers';
import { Dark, Notify } from 'quasar';

export default boot(() => {
  // Force the cozy dark look in all environments.
  Dark.set(true);

  Notify.setDefaults({
    position: 'top',
    timeout: 2200,
    progress: true,
    actions: [{ icon: 'close', color: 'white' }],
  });
});
