import React from 'react';
import { shallow } from 'enzyme';
import HelloWorldView from './HelloWorldView';

describe('HelloWorldView', () => {
  const propVal = {
    id: 'ELS Demo View'
  };
  it('should render ELS Demo view correctly', () => {
    const wrapper = shallow(<HelloWorldView {...propVal} />);
    expect(wrapper.find('div').prop('id')).toEqual('ELS Demo View');
  });
});
