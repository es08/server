const aConfig = require('config');
const config = aConfig.get('MainNode');

var sqlite3 = require('sqlite3').verbose();
var dbSqite = new sqlite3.Database(config.sqlite.databaseName);

var moment = require('moment');
var format = "YYYY-MM-DD HH:mm:ss.SSS";

var useSqlite = true;

var docRef;

var mqttUsername = process.env.mqttUsername || config.mqtt.username;
var mqttPassword = process.env.mqttPassword || config.mqtt.password;
var mqttClientId = process.env.mqttClientId || config.mqtt.clientId;

var mqttOptions = 
{
  username: mqttUsername,
  password: mqttPassword,
  clientId: mqttClientId
};

var server = config.mqtt.url;

var mqtt = require('mqtt')
var client  = mqtt.connect(server, mqttOptions);

console.log('start connecting to ' + server);

var beaconMainData = [];
var beaconFilterNearData = [];

var topicBeaconStay = config.beacon.topicBeaconStay;
var topicBeaconExit = config.beacon.topicBeaconExit;

var beaconTimeout = config.beacon.beaconTimeout;

var updateBeaconIntervalTime = config.beacon.updateBeaconIntervalTime;
var updateData;

client.on('connect', function()
{
  console.log('connected');
  updateData = setInterval(SaveData, updateBeaconIntervalTime);

  client.subscribe(topicBeaconExit, function(err) 
  {
    if (!err) {
      console.log('subscribe to topic ' + topicBeaconExit);
    }
  })

  client.subscribe(topicBeaconStay, function(err) 
  {
    if (!err) {
      console.log('subscribe to topic ' + topicBeaconStay);
    }
  })
})

client.on('offline', function() 
{
  console.log('offline');
  clearInterval(updateData);
})

client.on('message', function(topic, message) 
{
  console.log("topic " + topic);
  var pMessage = JSON.parse(message);
  // console.log(pMessage)
  for (var i = 0; i < pMessage.length; i++)
  {
    console.log("----------------")
    console.log("Location: " + pMessage[i].location)
    console.log("UUID: " + pMessage[i].UUID)
    console.log("Distance: " + pMessage[i].distance)
    console.log("Last Find Date: " + pMessage[i].lastFindDate)
  }
  console.log("----------------")
  
  if (topic == topicBeaconStay)
  {
    var parseMessage = message.toString('utf8');
    parseMessage = JSON.parse(parseMessage);

    BeaconUpdate(topic, parseMessage);
  }

  if (topic == topicBeaconExit)
  {
    var parseMessage = message.toString('utf8');
    parseMessage = JSON.parse(parseMessage);

    BeaconExit(topic, parseMessage);
  }

});

function BeaconUpdate(topic, message)
{
  CheckAndAddNewBeacon(message);
  
  //update beacon
  UpdateDistanceBeacon(message);
  
  // calculate distance to filter
  CalculateBeaconData();
}

function BeaconExit(topic, message)
{
  var beacons = message;

  // find index
  var removeIndex = [];
  for (var i = 0; i < beacons.length; i++)
  {
    var index = IndexOfBeacon(beacons[i], beaconMainData);
    if (index != -1)
    {
      removeIndex.push(index);
    }
  }

  removeIndex.sort(sortNumber);
  removeIndex = removeIndex.reverse();

  // remove from list
  for (var i = 0; i < removeIndex.length; i++)
  {
    RemoveBeaconFromMainAtIndex(removeIndex[i]);
  }

}

function CheckAndAddNewBeacon(message)
{
  var beacons = message;
  // find index
  var addIndex = [];
  for (var i = 0; i < beacons.length; i++)
  {
    var index = IndexOfBeacon(beacons[i], beaconMainData);
    if (index == -1)
    {
      addIndex.push(i);
    }
  }

  for (var i = 0; i < addIndex.length; i++)
  {
    AddNewBeacon(beacons[addIndex[i]]);
  }
}

function AddNewBeacon(beacon)
{
  console.log('AddNewBeacon ' + beacon.id);
  beaconMainData.push(beacon);
}

function UpdateDistanceBeacon(message)
{
  console.log('UpdateDistanceBeacon');

  var beacons = message;

  for (var i = 0; i < beacons.length; i++)
  {
    var index = IndexOfBeacon(beacons[i], beaconMainData);
    UpdateBeacon(beaconMainData[index], beacons[i]);
  }

}

function UpdateBeacon(beacon, updateBeacon)
{

  beacon.distance = updateBeacon.distance;
  beacon.lastServerUpdate = new Date();
  beacon.timeout = beaconTimeout;
}

function TryRemoveTimeoutBeacon()
{
  var removeIndex = [];
  for (var i = 0; i < beaconMainData.length; i++)
  {
    var beacon = beaconMainData[i];
    beacon.timeout = beacon.timeout - (new Date() - beacon.lastServerUpdate);

    //console.log(beacon.timeout)
    if (beacon.timeout < 0)
    {
      removeIndex.push(i);
    }
  }

  removeIndex = removeIndex.reverse();

  for (var i = 0; i < removeIndex.length; i++)
  {
    RemoveBeaconFromMainAtIndex(removeIndex[i]);
  }
}

function SaveData()
{
  CalculateBeaconData();
  console.log("---------------------")
  console.log("Send data to database")
  // add data to database
  for (var i = 0; i < beaconFilterNearData.length; i++)
  {
    console.log("beacon " + beaconFilterNearData[i].id + " " + beaconFilterNearData[i].location)
    SaveDataToDatabase(beaconFilterNearData[i]);
  }
  console.log("---------------------")
}

function CalculateBeaconData() 
{
  // update timout beacon and remove it
  TryRemoveTimeoutBeacon();
  
  var uniqIDList = GetListUniqID();
  var newBeaconFilterNearData = [];
  var beaconExitLocation = [];
  var beaconEnterLocation = [];
  
  //console.log('Do calculate');
  console.log('Total beacon(s) found from all scanners = ' + beaconMainData.length);
  console.log('All unique beacons = ' + uniqIDList.length);

  // calculate near distance
  for (var i = 0; i < uniqIDList.length; i++)
  {
    var uniqID = uniqIDList[i];
    var dataPerID = GetAllIDData(uniqID);
    var nearBeacon = GetNearestBeaconForTheirScanner(dataPerID)
    newBeaconFilterNearData.push(nearBeacon);
  }

  // add change location
  var changeData = GetChangeData(newBeaconFilterNearData, beaconFilterNearData);

  // update data
  beaconFilterNearData = newBeaconFilterNearData;

}

function GetChangeData(newData, oldData) 
{
  var exitBeacon = [];
  var enterBeacon = [];

  for (var i = 0; i < newData.length; i++)
  {
    var newBeacon = newData[i];
    if (IndexOfBeacon(newBeacon, oldData) == -1)
    {
      enterBeacon.push(newBeacon);
    }
  }

  for (var i = 0; i < oldData.length; i++)
  {
    var oldBeacon = oldData[i];
    if (IndexOfBeacon(oldBeacon, newData) == -1)
    {
      exitBeacon.push(oldBeacon);
    }
  }

  var changeData = { "enterBeacon": enterBeacon, "exitBeacon": exitBeacon }
  return changeData;
}

function GetNearestBeaconForTheirScanner(data)
{
  var nearBeacon = data[0];

  // console.log("Get near beacon id " + data[0].id)
  for (var i = 1; i < data.length; i++)
  {
    // console.log(data[i].location + " d: "+ data[i].distance)
    // console.log(data[i - 1].location + " d: "+ data[i - 1].distance)
    if (data[i].distance < nearBeacon.distance)
    {
      nearBeacon = data[i];
    }
  }

  return nearBeacon;
}
  
function GetAllIDData(uniqID)
{
  var list = [];
  for (var i = 0; i < beaconMainData.length; i++)
  {
    if (beaconMainData[i].id == uniqID)
    {
      list.push(beaconMainData[i]);
    }
  }  

  return list;
}

function GetListUniqID()
{
  var uniqID = [];

  for (var i = 0; i < beaconMainData.length; i++)
  {
    var beaconID = beaconMainData[i];
    var isExist = false;

    for (var j = 0; j < uniqID.length; j++)
    {

      if (uniqID[j] == beaconID.id)
      {
        isExist = true;
      }
    }

    // add if not exist
    if (isExist == false)
    {
      uniqID.push(beaconID.id);
    }

  }
  return uniqID;
}

function IndexOfBeacon(beacon, beaconList)
{
  for (var i = 0; i < beaconList.length; i++)
  {
    if (beacon.id == beaconList[i].id && beacon.location == beaconList[i].location)
    {
      return i;
    }
  }

  return -1;
}

function RemoveBeaconFromMainAtIndex(index)
{
  console.log("RemoveBeacon " + beaconMainData[index].id)
  beaconMainData.splice(index, 1);
}

function sortNumber(a,b) 
{
  return a - b;
}

function SaveDataToDatabase(beacon)
{
  beacon.saveDate = new Date();

  if (useSqlite)
  {
    console.log("Open database")
    dbSqite.serialize(function() {

      var sql_statement = "INSERT INTO Ble (UUID, measuredPower, lastFindDate, saveDate, txPower, timeout, distance, rssi, name, lastServerUpdate, id, location) VALUES ";

      sql_statement += "("
      sql_statement += "\"" + beacon.UUID + "\",";
      sql_statement += "\"" + beacon.measuredPower + "\",";
      sql_statement += "\"" + moment(beacon.lastFindDate).format(format) + "\",";
      sql_statement += "\"" + moment(beacon.saveDate).format(format) + "\",";
      sql_statement += "\"" + beacon.txPower + "\",";
      sql_statement += "\"" + beacon.timeout + "\",";
      sql_statement += "\"" + beacon.distance + "\",";
      sql_statement += "\"" + beacon.rssi + "\",";
      sql_statement += "\"" + beacon.name + "\",";
      sql_statement += "\"" + moment(beacon.lastServerUpdate).format(format) + "\",";
      sql_statement += "\"" + beacon.id + "\",";
      sql_statement += "\"" + beacon.location + "\")";

      dbSqite.run(sql_statement)

    });

    // dbSqite.close();
    console.log("Save to sqlite3")
  }
  else 
  {
    // if save to firebase
    console.log("Save to firebase")
  }
}
