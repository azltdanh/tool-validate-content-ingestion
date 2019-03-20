import React from 'react';
import { shallow } from 'enzyme';
import HelloWorldComponent from './HelloWorldComponent';
import HelloWorldView from './HelloWorldView';

describe('HelloWorldComponent', () => {
  const propVal = {
    id: 'ELS Demo component'
  };
  it('should render ELS Demo component correctly', () => {
    const wrapper = shallow(<HelloWorldComponent {...propVal} />);
    expect(wrapper.find(HelloWorldView).length).toBe(1);
  });
});
