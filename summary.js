const aConfig = require('config');
const config = aConfig.get('Summary');

const express = require('express')
const app = express()
const port = config.server.port;

var pretty = require('express-prettify');

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(config.sqlite.databaseName);

var moment = require('moment');
var format = "YYYY-MM-DD HH:mm:ss.SSS";

app.use(express.static('public'))
app.use(express.static('node_modules/bootstrap/dist'))
app.use(express.static('node_modules/jquery/dist'))
app.use(express.static('node_modules/moment/min'))
app.use(express.static('node_modules/js-datepicker/dist'))
app.use('/beacon/list', express.static('beacon_list.json'))
app.use(pretty({ query: 'pretty' }));

// app.set('json spaces', 2);

app.get('/', (req, res) => res.sendFile("index.html"))
app.get('/report_range', (req, res) => res.sendFile(__dirname + "/public/report_range.html"))
app.get('/export', function (req, res) { 
  res.sendFile(__dirname + "/" + config.sqlite.databaseName);
});

app.get('/getData', function (req, res) {

  var date = new Date(req.query.date);

  var startTime = moment(date);
  var endTime = moment(date);

  startTime.second(0);
  startTime.minute(0);
  startTime.hour(0);

  endTime.second(59);
  endTime.minute(59);
  endTime.hour(23);

  db.serialize(function() {
    sql_statement = "SELECT * FROM Ble WHERE lastServerUpdate BETWEEN '" + startTime.format(format) + "' AND '" + endTime.format(format) + "' ";

    db.all(sql_statement, function(err, data) {
      if (!err)
      {
        res.json(data)
      }
      else
      {
        res.send([])
      }
    });
  });  
})

app.get('/getDataRange', function (req, res) {

  var dateFrom = new Date(req.query.dateFrom);
  var dateTo = new Date(req.query.dateTo);

  var startTime = moment(dateFrom);
  var endTime = moment(dateTo);

  startTime.second(0);
  startTime.minute(0);
  startTime.hour(0);

  endTime.second(59);
  endTime.minute(59);
  endTime.hour(23);

  db.serialize(function() {
    sql_statement = "SELECT * FROM Ble WHERE lastServerUpdate BETWEEN '" + startTime.format(format) + "' AND '" + endTime.format(format) + "' ";

    db.all(sql_statement, function(err, data) {
      if (!err)
      {
        res.json(data)
      }
      else
      {
        res.send([])
      }
    });
  });
})

app.get('/api/v1/dataRange', function (req, res) {

  var onlyTimeDate = 'HH:mm';
  var filterTimeSlot = [
    {
      min: "00:00",
      max: "06:00",
      location: {},
      ble:[],
      data: []
    },
    {
      min: "06:00",
      max: "07:00",
      location: {},
      ble:[],
      data: []
    },
    {
      min: "07:00",
      max: "08:00",
      location: {},
      ble:[],
      data: []
    },
    {
      min: "09:00",
      max: "10:00",
      location: {},
      ble:[],
      data: []
    },
    {
      min: "10:00",
      max: "11:00",
      location: {},
      ble:[],
      data: []
    },
    {
      min: "11:00",
      max: "12:00",
      location: {},
      ble:[],
      data: []
    },
    {
      min: "12:00",
      max: "13:00",
      location: {},
      ble:[],
      data: []
    },
    {
      min: "13:00",
      max: "14:00",
      location: {},
      ble:[],
      data: []
    },
    {
      min: "14:00",
      max: "15:00",
      location: {},
      ble:[],
      data: []
    },
    {
      min: "15:00",
      max: "16:00",
      location: {},
      ble:[],
      data: []
    },
    {
      min: "16:00",
      max: "17:00",
      location: {},
      ble:[],
      data: []
    },
    {
      min: "17:00",
      max: "18:00",
      location: {},
      ble:[],
      data: []
    },    
    {
      min: "18:00",
      max: "24:00",
      location: {},
      ble:[],
      data: []
    }
  ];

  var dateFrom = new Date(req.query.dateFrom);
  var dateTo = new Date(req.query.dateTo);

  var startTime = moment(dateFrom);
  var endTime = moment(dateTo);

  startTime.second(0);
  startTime.minute(0);
  startTime.hour(0);

  endTime.second(59);
  endTime.minute(59);
  endTime.hour(23);

  db.serialize(function() {
    sql_statement = "SELECT * FROM Ble WHERE lastServerUpdate BETWEEN '" + startTime.format(format) + "' AND '" + endTime.format(format) + "' AND LOCATION <> \"\"";

    db.all(sql_statement, function(err, data) {
      if (!err)
      {
        var result = Groupdata(data);
        res.json(result);
      }
      else
      {
        res.send([]);
      }
    });
  });

  function Groupdata(data)
  {
    var resultData = {};
    var colums = [];
    var rows = [];

    // add time
    for (var i = 0; i < data.length; i++) 
    {
      var time = new moment(data[i].saveDate);
      data[i].time = time;
      data[i].timeText = time.format(onlyTimeDate);
      data[i].day = new moment(data[i].saveDate).format("YYYYMMDD");
    }

    // filter time slot
    for (var i = 0; i < filterTimeSlot.length; i++) 
    {
      filterTimeSlot[i].ble = [];
      var result = data.filter(a => {
        return a.timeText >= filterTimeSlot[i].min && a.timeText < filterTimeSlot[i].max
      });
      filterTimeSlot[i].data = result;
    }

    for (var i = 0; i < filterTimeSlot.length; i++) 
    {
      timeSlotData = filterTimeSlot[i].data;
      flags = [], output = [];

      // get uniqID for each time slot
      for (var j = 0; j < timeSlotData.length; j++)
      {
        if (flags[timeSlotData[j].id]) continue;
        flags[timeSlotData[j].id] = true;
        output.push(timeSlotData[j].id);
      }
      filterTimeSlot[i].ble = output;

      flags = [], output = [];
      // get uniq found location for each time slot
      for (var j = 0; j < timeSlotData.length; j++)
      {
        if (flags[timeSlotData[j].location]) continue;
        flags[timeSlotData[j].location] = true;
        output.push(timeSlotData[j].location);
      }
      // console.log(output)
      filterTimeSlot[i].location = {};

      for (var j = 0; j < output.length; j++)
      {
        filterTimeSlot[i].location[output[j]] = [];
      }

      for (var j = 0; j < timeSlotData.length; j++)
      {
        filterTimeSlot[i].location[timeSlotData[j].location].push(timeSlotData[j]);
      }

    }

    flags = [], output = [], l = data.length;
    for (var i = 0; i < data.length; i++) 
    {
      if (flags[data[i].location]) continue;
      flags[data[i].location] = true;
      output.push(data[i].location);
    }

    var uniqLocation = output;
    uniqLocation.sort();
    var uniqDay = UniqDay(data);

    colums.push("Day");
    colums.push("Location");

    for (var i = 0; i < filterTimeSlot.length; i++) 
    {
      colums.push(filterTimeSlot[i].min + "-" + filterTimeSlot[i].max);
    }

    // console.log(filterTimeSlot)
    for (var k = 0; k < uniqDay.length; k++)
    {
      for (var i = 0; i < uniqLocation.length; i++) 
      {
        var row = [];
        var currentFillDay = uniqDay[k];
        var locationName = uniqLocation[i];
        row.push(moment(currentFillDay, "YYYYMMDD").format('L'));
        row.push(locationName);

        for (var j = 0; j < filterTimeSlot.length; j++) 
        {
          var allBleInLocation = filterTimeSlot[j].location[locationName];

          totalBle = FilterDay(allBleInLocation, currentFillDay);
          totalBle = UniqId(totalBle);
          totalBle = totalBle.length;
          
          row.push(totalBle);
        }
        rows.push(row);
      }
    }

    resultData.colums = colums;
    resultData.rows = rows;

    return resultData;
  }

  function FilterDay(dataArray, day)
  {
    if (dataArray == undefined)
    {
      return [];
    }
    flags = [], output = [];

    // get uniq found location for each time slot
    for (var j = 0; j < dataArray.length; j++)
    {
      if (dataArray[j].day != day) continue;
      output.push(dataArray[j]);
    }

    return output;
  }

  function UniqDay(dataArray)
  {
    if (dataArray == undefined)
    {
      return [];
    }
    flags = [], output = [];

    // get uniq found location for each time slot
    for (var j = 0; j < dataArray.length; j++)
    {
      if (flags[dataArray[j].day]) continue;
      flags[dataArray[j].day] = true;
      output.push(dataArray[j].day);
    }

    return output;
  }

  function UniqId(dataArray)
  {
    
    if (dataArray == undefined)
    {
      return [];
    }
    flags = [], output = [];

    // get uniq found location for each time slot
    for (var j = 0; j < dataArray.length; j++)
    {
      if (flags[dataArray[j].id]) continue;
      flags[dataArray[j].id] = true;
      output.push(dataArray[j].id);
    }

    return output;
  }

})

app.listen(port, () => console.log(`app listening on port ${port}!`))