import React from 'react';
import ReactDOM from 'react-dom';
import { AppContainer } from 'react-hot-loader';
import DemoApp from './DemoApp';

const render = Component => {
  ReactDOM.render(
    <AppContainer>
      <Component />
    </AppContainer>,
    document.getElementById('app')
  );
};

render(DemoApp);

// Webpack Hot Module Replacement API
if (module.hot) {
  module.hot.accept('./DemoApp', () => {
    render(DemoApp);
  });
}
