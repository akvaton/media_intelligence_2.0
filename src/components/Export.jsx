import React, { useEffect } from 'react';

const Dashboard = (props) => {
  useEffect(() => {
    console.log(
      'Records',
      props.records.map((record) => record.params),
    );

    //  TODO: Redirect to props.resource.href
  }, [props]);

  return (
    <pre>
      {JSON.stringify(
        props.records.map((record) => record.params),
        null,
        ' ',
      )}
    </pre>
  );
};

export default Dashboard;
