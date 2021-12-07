import React, { useEffect } from 'react';
import set from 'lodash.set';

const ExportInteractions = (props) => {
  const records = props.records.map((record) => {
    const object = {};

    Object.entries(record.params).forEach(([key, value]) => {
      set(object, key, value);
    });

    return object;
  });
  useEffect(() => {
    console.log(
      'Records',
      props.records.map((record) => record.params),
    );
    //  TODO: Redirect to props.resource.href
  }, [records]);

  return <pre>{JSON.stringify(records, null, ' ')}</pre>;
};

export default ExportInteractions;
