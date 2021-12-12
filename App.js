import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  Button,
  PermissionsAndroid,
  LogBox,
  Pressable,
} from 'react-native';
import {BleManager} from 'react-native-ble-plx';

export const manager = new BleManager();

const requestPermission = async () => {
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Request for Location Permission',
      message: 'Bluetooth Scanner requires access to Fine Location Permission',
      buttonNeutral: 'Ask Me Later',
      buttonNegative: 'Cancel',
      buttonPositive: 'OK',
    },
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
};

export default function App() {
  const [logData, setLogData] = useState([]);
  const [logCount, setLogCount] = useState(0);
  const [scannedDevices, setScannedDevices] = useState({});
  const [deviceCount, setDeviceCount] = useState(0);

  useEffect(() => {
    LogBox.ignoreLogs(['new NativeEventEmitter']); // Ignore log notification by message
    LogBox.ignoreAllLogs(); //Ignore all log notifications
    manager.onStateChange(state => {
      const subscription = manager.onStateChange(async state => {
        console.log(state);
        const newLogData = logData;
        newLogData.push(state);
        await setLogCount(newLogData.length);
        await setLogData(newLogData);
        subscription.remove();
      }, true);
      return () => subscription.remove();
    });
  }, [manager]);

  const toggleBluetooth = async () => {
    const btState = await manager.state();
    // test is bluetooth is supported
    if (btState === 'Unsupported') {
      alert('Bluetooth is not supported');
      return false;
    }
    // enable if it is not powered on
    if (btState !== 'PoweredOn') {
      await manager.enable();
    } else {
      await manager.disable();
    }
    return true;
  };

  const onScanDevices = async () => {
    const btState = await manager.state();
    // test if bluetooth is powered on
    if (btState !== 'PoweredOn') {
      alert('Bluetooth is not powered on');
      return false;
    }
    // explicitly ask for user's permission
    const permission = await requestPermission();
    if (permission) {
      manager.startDeviceScan(null, null, async (error, device) => {
        // error handling
        if (error) {
          console.log(error);
          return;
        }
        // found a bluetooth device
        if (device) {
          if (device.name === 'MBeacon') {
            device
              .isConnected() // check whether it's already conncted
              .then(isConnected => {
                console.log('isConnected::', device.id,  isConnected);
                return isConnected ? device : device.connect();
              })
              .then(d => {
                console.log('connect::', device.id, d);
                return d.discoverAllServicesAndCharacteristics();
              })
              .then(d => {
                console.log('discoverAllServicesAndCharacteristics::', d);
                return d.services();
              });

            // console.log(`${device.name} (${device.id})}`);
            const newScannedDevices = scannedDevices;
            newScannedDevices[device.id] = device;
            await setDeviceCount(Object.keys(newScannedDevices).length);
            await setScannedDevices(scannedDevices);
          }
        }
      });
    }
    return true;
  };

  const onConnectDevice = device => {
    manager
      .connectToDevice(device.id, {autoConnect: true})
      .then(response => {
        async () => {
          const services = await device.discoverAllServicesAndCharacteristics();
        };
        alert('connect');
      })
      .catch(error => {
        console.error(error);
      });
  };

  return (
    <View style={{flex: 1, padding: 10}}>
      <View style={{flex: 1, padding: 10}}>
        <Text style={{fontWeight: 'bold'}}>Bluetooth Log ({logCount})</Text>
        <FlatList
          data={logData}
          renderItem={({item}) => {
            return <Text>{item}</Text>;
          }}
        />
        <Button title="Turn On Bluetooth" onPress={() => toggleBluetooth()} />
      </View>

      <View style={{flex: 2, padding: 10}}>
        <Text style={{fontWeight: 'bold'}}>
          Scanned Devices ({deviceCount})
        </Text>
        <FlatList
          data={Object.values(scannedDevices)}
          renderItem={({item}) => {
            return (
              <Pressable
                style={{marginVertical: 10}}
                onPress={() => onConnectDevice(item)}>
                <Text>{`${item.name} (${item.id})`}</Text>
              </Pressable>
            );
          }}
        />
        <Button title="Scan Devices" onPress={() => onScanDevices()} />
      </View>
    </View>
  );
}
