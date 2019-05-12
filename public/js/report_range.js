var timeSlotData, output, flags;
var data = [];
var beacon_list;
var beaconDataTable;
// filter group time slot
// 00 - 06, 06 - 12, 12 - 18, 18 - 24
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

var selectDateFrom = "";
var selectDateTo = "";

$(document).ready(function() {

  selectDateFrom = new Date();
  selectDateFrom.setDate(selectDateFrom.getDate() - 1);

  var pickerFrom = datepicker('#date-from', {
    id: 1,
    onSelect: (instance, date) => {
      selectDateFrom = date;
      pickerFrom.setMax(selectDateTo);
      pickerTo.setMin(selectDateFrom);
    },
    dateSelected: selectDateFrom
  })


  selectDateTo = new Date();
  var pickerTo = datepicker('#date-to', {
    id: 2,
    onSelect: (instance, date) => {
      selectDateTo = date;
      pickerFrom.setMax(selectDateTo);
      pickerTo.setMin(selectDateFrom);
    },
    dateSelected: selectDateTo
  })

  pickerFrom.setMax(selectDateTo);
  pickerTo.setMin(selectDateFrom);

  $("#date-from").val(moment(selectDateFrom).format('ddd MMM DD YYYY'));
  $("#date-to").val(moment(selectDateTo).format('ddd MMM DD YYYY'));

  $.get( "beacon/list", { date: selectDateFrom}, function(aData) {

  })
  .done(function(data) {
    beacon_list = data;
  })
  .fail(function() {
    
  })
  .always(function() {
    $("#loading").hide();
  });


  $('#modalDetail').on('show.bs.modal', function(e) {
    var location = $(e.relatedTarget).data('location-name');
    var slot = $(e.relatedTarget).data('slot');
    var day =  $(e.relatedTarget).data('day');

    var allId = UniqIdInDay(filterTimeSlot[slot].location[location], day);
    var minTime = filterTimeSlot[slot].min;
    var maxTime = filterTimeSlot[slot].max;
    var idText = ""

    idText += "<div>Ble found between " + minTime + "-" + maxTime + "</div><br/>";
    idText += "<table id=\"beacon_list_table\" class=\"table table-striped table-bordered table-hover\"><thead><tr> <th scope=\"col\">Name</th><th scope=\"col\">id</th> <th scope=\"col\">found times</th> </tr></thead>"
    idText += "<tbody>"
    for (var i = 0; i < allId.length; i++)
    {
      idText += "<tr>"
      idText += "<th>" + beacon_list[allId[i]] + "</th>"
      idText += "<th>" + allId[i] + "</th>"
      idText += "<th>" + CountIdInDay(filterTimeSlot[slot].location[location], allId[i], day) + "</th>"
      idText += "</tr>"
    }

    idText += "</tbody>"
    idText += "</table>"

    $("#modal-body").html(idText);
    $('#beacon_list_table').DataTable(
    {
      searching: false,
      paging: false,
    });

  });

  $("#get-data").click(function() {
    // Get data
    if (selectDateFrom != "" && selectDateTo != "")
    { 
      $("#loading").show('show');

      var jqxhr = $.get( "getDataRange", { dateFrom: selectDateFrom, dateTo: selectDateTo}, function(aData) {
        
        // hardcode remove location
        var empty_location = []

        for (var i = 0; i < aData.length; i++)
        {
          if (aData[i].location == "")
          {
            empty_location.push(i);
          }
        }

        for (var i = empty_location.length - 1; i >= 0; i--)
        {
          aData.splice(empty_location[i], 1);
        }

        data = aData;

        ///////////////////////////////

        $("#report_date").text(
          "Report from " + moment(selectDateFrom).format("LL") + " " +
          "to " + moment(selectDateTo).format("LL"));
        Groupdata();

        //////////////////////////////

        if (data.length == 0)
        {
          $("#show_table_data").hide();
          $("#empty").show();
        }
        else
        {
          $("#show_table_data").show();
          $("#empty").hide();
        }

      })
      .done(function(data) {

      })
      .fail(function() {
        
      })
      .always(function() {
        $("#loading").hide();
      });
    }
  });

  $("#get-data").click();

});

function Groupdata()
{
  // destroy table
  if (beaconDataTable)
  {
    beaconDataTable.clear().destroy();
  }

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
  var uniqDay = UniqDay(data);

  // append data to html
  var tableTitle = $("#table_title");
  var tableData = $("#table_data");

  tableTitle.empty();

  tableTitle.append("<th>Day</th>");
  tableTitle.append("<th>Location</th>");
  for (var i = 0; i < filterTimeSlot.length; i++) 
  {
    tableTitle.append("<th>" + filterTimeSlot[i].min + "-" + filterTimeSlot[i].max + "</th>");
  }

  tableData.empty();
  // console.log(filterTimeSlot)
  for (var k = 0; k < uniqDay.length; k++)
  {
    for (var i = 0; i < uniqLocation.length; i++) 
    {
      var currentFillDay = uniqDay[k];
      var locationName = uniqLocation[i];
      var row = "";
      row += "<th scope=\"row\">" + moment(currentFillDay, "YYYYMMDD").format('L') + "</th>";
      row += "<th scope=\"row\">" + locationName + "</th>";

      for (var j = 0; j < filterTimeSlot.length; j++) 
      {
        var allBleInLocation = filterTimeSlot[j].location[locationName];

        totalBle = FilterDay(allBleInLocation, currentFillDay);
        totalBle = UniqId(totalBle);
        totalBle = totalBle.length;
        
        var addClass = "class=\"showmodal\"";

        if (totalBle == 0)
        {
          addClass = "";
        }

        var clickModal = "<a " + addClass + "data-toggle=\"modalDetail\" data-target=\"#modalDetail\" href=\"#modalDetail\" " + "data-location-name=\"" + locationName + "\"" + "data-slot=\"" + j + "\"" + " data-day=\"" + currentFillDay + "\"" + ">" + totalBle + "</a>";

        row += "<th>" + clickModal + "</th>";
      }
      tableData.append("<tr>" + row + "</tr>");

    }
  }

  $(".showmodal").click(function() {
    $('#modalDetail').modal('toggle', $(this));
  });
    // console.log(filterTimeSlot)
    // console.log("----------------");

  beaconDataTable = $('#show_table_data').DataTable(
  {
    scrollX: true,
    searching: false,
    paging: false,
    buttons: [
      'csv', 'excel'
    ],
    dom: 'Bfrtip',
    destroy: true,
    retrieve: true,
    order: [[ 0, 'asc' ], [ 1, 'asc' ]]
  });
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

function CountIdInDay(dataArray, id, day)
{
  if (dataArray == undefined)
  {
    return 0;
  }
  
  var count = 0;
  for (var j = 0; j < dataArray.length; j++)
  {
    if (dataArray[j].id != id || dataArray[j].day != day) continue;
    count++;
  }

  return count;
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

function UniqIdInDay(dataArray, day)
{ 
  if (dataArray == undefined)
  {
    return [];
  }
  flags = [], output = [];

  // get uniq found location for each time slot
  for (var j = 0; j < dataArray.length; j++)
  {
    if (flags[dataArray[j].id] || dataArray[j].day != day) continue;
    flags[dataArray[j].id] = true;
    output.push(dataArray[j].id);
  }

  return output;
}