import {Composition} from 'remotion';
import {FlightMap, flightMapDefaults} from './FlightMap';

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="RomaBruxelles"
        component={FlightMap}
        durationInFrames={420}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={flightMapDefaults}
      />
    </>
  );
};
