import Plausible from 'plausible-tracker'

const plausible = Plausible({
  domain: 'lowderplay.dev',
  apiHost: 'https://analytics.gesti.tech'
});

export {plausible};
