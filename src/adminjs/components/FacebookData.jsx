import React, { useEffect } from 'react';
import set from 'lodash.set';

const FacebookData = ({ record }) => {
  useEffect(() => {
    const normalizedRecord = Object.entries(record.params).reduce(
      (acc, [key, value]) => {
        set(acc, key, value);
        return acc;
      },
      {},
    );
    const { facebookGraphData } = normalizedRecord;
    const fullGraphData = facebookGraphData.map((item) => [
      item.lnAudienceTime,
      item.lnFacebookInteractions,
    ]);
    const selectedFragmentData = normalizedRecord.facebookGraphData
      .slice(normalizedRecord.startIndex - 1, normalizedRecord.endIndex)
      .map((item) => [item.lnAudienceTime, item.lnFacebookInteractions]);

    [
      { title: 'Повна Діаграма', id: 'container', data: fullGraphData },
      {
        title: 'Виділені фрагменти',
        id: 'selectedFragment',
        data: selectedFragmentData,
      },
    ].forEach(({ title, id, data }) => {
      window.Highcharts.chart(id, {
        title: { text: title },
        yAxis: { title: { text: 'Facebook Interactions ln' }, min: 0 },
        xAxis: {
          title: { text: 'Audience Time ln' },
          min: 0,
          tickInterval: 0.5,
        },
        tooltip: {
          headerFormat: '<b>{series.name}</b><br/>',
          pointFormat:
            'lnAudienceTime = {point.x}, lnFacebookInteractions = {point.y}',
        },
        series: [{ name: '', data, keys: ['x', 'y'] }],
        plotOptions: { series: { marker: { enabled: true } } },
      });
    });
  }, []);

  return (
    <div>
      <div id="container" />
      <div id="selectedFragment" />
    </div>
  );
};

export default FacebookData;
