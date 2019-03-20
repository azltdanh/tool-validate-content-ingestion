import React from 'react';
import './demo.scss';
import { ELSHelloWorld } from '../module';
class DemoApp extends React.PureComponent {
  render() {
    return (
      <div>
        <ELSHelloWorld id="hello" text="Hello World" />
      </div>
    );
  }
}

export default DemoApp;
