/*------------------------------------------------------------------------------
FAVITESViz is a tool for visualizing the output of FAVITES
(FrAmework for VIral Transmission and Evolution Simulation)

FAVITESViz was built mainly using the Cytoscape Library, as well as other
dependencies credited below.

Dependencies:
chart.js
cytoscape-qtip extension
cytoscape-coSE-bilkent extension for layouts:
U. Dogrusoz, E. Giral, A. Cetintas, A. Civril, and E. Demir,
"A Layout Algorithm For Undirected Compound Graphs", Information Sciences,
179, pp. 980-994, 2009.
 -----------------------------------------------------------------------------*/

/*------------------------ Initializing variables ----------------------------*/

// hiding elements upon initialization //
$('#backbtn').hide(0);
$('#nodeInfo').hide(0);

// global variables //
var transmissionDelay = 0;
var remissionDelay = 0;
var nodeID = null;
var nodeTreeElements = [];
var notNodeTree = [];
var nodeSelectMode = false;
var showGraphmode = false;
var transmitDone = false;
var infectData = [];
var infectLabels = [];
var remissionData = [];
var nodeInfo = [];

// Cytoscape initializing empty main contact/transmission graph //
var cy = cytoscape({
  container: document.getElementById('cy'),
  boxSelectionEnabled: false,
  autoungrabify: true,
  motionblur: true,
  elements: [],
  style: [{
      selector: 'node',
      style: {
        'width': '30',
        'height': '30'
      }
    },
    {
      selector: '.transmission_node',
      style: {
        'background-color': '#bc0101',
        'transition-property': 'background-color, line-color, target-arrow-color',
        'transition-duration': '0.3s',
      }
    },
    {
      selector: '.remission_node',
      style: {
        'background-color': '#00ddff',
        'transition-property': 'background-color, line-color, target-arrow-color',
        'transition-duration': '0.3s',
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 0.3,
        'curve-style': 'bezier',
        'target-arrow-color': '#8c8c8c'
      }
    },
    {
      selector: '.transmission_edge',
      style: {
        'line-color': '#bc0101',
        'transition-property': 'background-color, line-color, target-arrow-color',
        'transition-duration': '0.3s',
        'width': '3',
      }
    },
    // nodetree style for nodes/edges //
    {
      selector: '.Neighborhood',
      style: {},
    },
    {
      selector: '.notNeighborhood',
      style: {
        'visibility': 'hidden',
      }
    },
  ]
});

// initializing infection chart //
Chart.defaults.global.defaultFontFamily = 'Oxygen';
var ctx = document.getElementById("infectGraph").getContext('2d');
var infectGraph = new Chart(ctx, {});

// initializing remission chart //
var ctx2 = document.getElementById("remissionGraph").getContext('2d');
var remissionGraph = new Chart(ctx2, {});

/*--------------------------- Function Definitions ---------------------------*/

// Main function //
window.onload = function() {
  contacttransmitGraph();
  cy.on('click', 'node', function() {
    nodeID = this.id();
    nodeTreeView(nodeID);
  });
};

// Initializing the graph with both contact and transmission network files //
function contacttransmitGraph() {
  // Reading FAVITES FILE //
  var contactInput = document.getElementById('contactInput');
  var transmissionInput = document.getElementById('transmissionInput');
  var fileDisplayArea = document.getElementById('fileDisplayArea');
  // Contact Network file reading and displaying //
  contactInput.addEventListener('change', function(e) {
    var file = contactInput.files[0];
    var textType = /text.*/;
    if (file.type.match(textType)) {
      $('#inputFile1').fadeOut("slow");
      var reader = new FileReader();
      reader.onload = function(e) {
        var contactLines = reader.result.split("\n");
        // Iterating and adding each element to cytest graph //
        for (i = 0; i < contactLines.length; i++) {
          var contactArray = contactLines[i].split("\t");
          // ADDING NODES //
          if (contactArray[0] === "NODE") {
            cy.add({
              group: "nodes",
              data: {
                id: contactArray[1]
              }
            });
          }
          // ADDING EDGES //
          else if (contactArray[0] === "EDGE") {
            cy.add({
              group: "edges",
              data: {
                id: contactArray[1] + contactArray[2],
                source: contactArray[1],
                target: contactArray[2]
              }
            });
          }
        }
        // Cytoscape Layout function //
        cy.layout({
          name: 'cose-bilkent',
          fit: true,
          nodeRepulsion: 1000000000,
          avoidOverlap: true
        }).run();
      }
      reader.readAsText(file);
    }
  })
  // Transmission Network file reading and displaying //
  transmissionInput.addEventListener('change', function(e) {
    var file = transmissionInput.files[0];
    var textType = /text.*/;
    if (file.type.match(textType)) {
      $('#inputFile2').fadeOut("slow");
      var reader = new FileReader();
      reader.onload = function(e) {
        var counter = 0;
        var remiCounter = 0;
        var transmitLines = reader.result.split("\n");
        // iterating and plotting the transmission nodes //
        for (i = 0; i < transmitLines.length; i++) {
          counter = counter + 1;
          var transmitArray = transmitLines[i].split("\t");
          infectLabels.push(Math.ceil(transmitArray[2]));
          infectData.push(counter);
          // checking for empty line or hashtag at the end of file //
          if (transmitArray[0].length == 0) {
            console.log('empty line');
          }
          // checking for initial infected nodes //
          else if (transmitArray[0] === "None") {
            updateTransmitNode('#' + transmitArray[1], 0);
          }
          // checking if nodes are in remmission //
          else if (transmitArray[0] == transmitArray[1]) {
            remiCounter = remiCounter + 1;
            remissionData.push(remiCounter);
            infectData.pop(); // removing nodes in remission from infection graph
            infectData.push(0);
            remissionDelay = Math.ceil(transmitArray[2] * 500);
            updateRemissionNode('#' + transmitArray[0], remissionDelay);
          }
          // checking if edge ID (Node1Node2) exists  //
          else if (cy.$('#' + transmitArray[0] + transmitArray[1]).length) {
            transmissionDelay = Math.ceil(transmitArray[2] * 500);
            updateTransmitEdge('#' + transmitArray[0] + transmitArray[1], transmissionDelay);
            updateTransmitNode('#' + transmitArray[1], transmissionDelay);
          }
          // checking if edge ID (Node2Node1) exists //
          else if (cy.$('#' + transmitArray[1] + transmitArray[0]).length) {
            transmissionDelay = Math.ceil(transmitArray[2] * 500);
            updateTransmitEdge('#' + transmitArray[1] + transmitArray[0], transmissionDelay);
            updateTransmitNode('#' + transmitArray[1], transmissionDelay);
          }
          // error message in case nodes/edges were not defined in the contact network (for developer usage) //
          else {
            console.log('The edge with ID ' + transmitArray[0] + transmitArray[1] + ' or ' + transmitArray[1] + transmitArray[0] + ' does not exist.');
          }
        }
        //checking if transmission is done //
        transmitDone = true;
      }
      reader.readAsText(file);
    }
  })
}

/*---------- functions for user manipulation after graph initializes ---------*/

function updateTransmitNode(nodeID, delay) {
  if (nodeID.length) {
    window.setTimeout(function() {
      cy.$(nodeID).classes('transmission_node');
    }, delay);
  }
}

function updateTransmitEdge(edgeID, delay) {
  if (edgeID.length) {
    window.setTimeout(function() {
      cy.$(edgeID).classes('transmission_edge');
    }, delay);
  }
}

function updateRemissionNode(nodeID, delay) {
  if (nodeID.length) {
    window.setTimeout(function() {
      cy.$(nodeID).classes('remission_node');
    }, delay);
  }
}

// individual node tree view //
function nodeTreeView(nodeTreeID, infectdata) {
  if (transmitDone == true) {
    if (nodeSelectMode == false) {
      nodeSelectMode = true;
      showGraphmode = true;
      nodeTreeElements = cy.$('#' + nodeTreeID).closedNeighborhood();
      notNodeTree = cy.elements().not(nodeTreeElements);
      notNodeTree.toggleClass('notNeighborhood', true);
      nodeTreeElements.toggleClass('Neighborhood', true);
      $('#backbtn').show(0);
      $('#nodeInfo').show(0);
      // new layout //
      cy.center(nodeID);
      // Qtip code for each node//
      cy.nodes().qtip({
        content: function() {
          return this.id()
        },
        position: {
          my: 'top center',
          at: 'bottom center'
        },
        style: {
          classes: 'qtip-bootstrap',
          tip: {
            width: 10,
            height: 8
          }
        }
      });
      showCharts(infectdata);
      //Resetting the graph when back button is pressed //
      backbtn.addEventListener('click', function() {
        notNodeTree.toggleClass('notNeighborhood', false);
        nodeTreeElements.toggleClass('Neighborhood', false);
        showGraphmode = false;
        nodeSelectMode = false;
        hideCharts();
        $('#backbtn').hide(0);
        $('#nodeInfo').hide(0);

      });
    }
  } else {
    alert('Transmission graph has not been uploaded');
  }
}


function showCharts(infectdata, animDuration) {
  if (showGraphmode == true) {
    // adding the newly acquired data to show the graph //
    infectGraph = new Chart(ctx, {
      type: 'line',
      data: {
        labels: infectLabels,
        xAxisID: 'Time',
        yAxisID: 'Infected',
        datasets: [{
          label: 'People Infected',
          data: infectData,
          borderColor: "#bc0101",
          backgroundColor:"#bc0101",
          fill: true
        }]
      },
      options: {
        scales: {
          yAxes: [{
            scaleLabel: {
              display: true,
              labelString: '# of Infected'
            }
          }],
          xAxes: [{
            scaleLabel: {
              display: true,
              labelString: 'Time'
            }
          }]
        }
      }
    });
    remissionGraph = new Chart(ctx2, {
      type: 'line',
      data: {
        labels: infectLabels,
        xAxisID: 'Time',
        yAxisID: 'Remission',
        datasets: [{
          label: 'People in Remission',
          data: remissionData,
          borderColor: "#00ddff",
          backgroundColor:"#00ddff",
          fill: true
        }]
      },
      options: {
        scales: {
          yAxes: [{
            scaleLabel: {
              display: true,
              labelString: '# in Remission'
            }
          }],
          xAxes: [{
            scaleLabel: {
              display: true,
              labelString: 'Time'
            }
          }]
        }
      }
    });
  }
}

function hideCharts() {
  if (showGraphmode == false) {
    // changing both graph data to null (to hide) //
    infectGraph = new Chart(ctx, {});
    remissionGraph = new Chart(ctx2, {});
  }
}
