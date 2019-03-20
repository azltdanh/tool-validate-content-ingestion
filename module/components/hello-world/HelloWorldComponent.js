import React, { Component } from 'react';
import PropsTypes from 'prop-types';
import HelloWorldView from './HelloWorldView';

export default class HelloWorldComponent extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return <HelloWorldView {...this.props} />;
  }
}

HelloWorldComponent.propTypes = {
  id: PropsTypes.string.isRequired,
  text: PropsTypes.string
};

HelloWorldComponent.defaultProps = {
  id: 'helloworld',
  text: 'Hello World'
};
