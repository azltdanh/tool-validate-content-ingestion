/*eslint-disable react/prop-types*/
import React from 'react';
export default props => {
  return (
    <div id={props.id} className="c-els-field__message c-els-field__message--success">
      {props.text}
    </div>
  );
};
