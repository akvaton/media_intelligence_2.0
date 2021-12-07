import React, { useEffect } from 'react';

const FacebookData = (props) => {
  useEffect(() => {
    console.log('Props', props);
  }, [props]);

  return <pre>Hello</pre>;
};

export default FacebookData;
