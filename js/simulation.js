const $mapContainer = $('#map-container');
const $map = $('#map');
const $timer = $('#timer');
const $modal = $('#instructions-modal');
const $popupModal = $("#popup-modal");
const $btn = $('#instructions-button');
const $minimapImage = $("#minimap");
const $humanImage = $("#human-image");
const $botImage = $("#bot-image");
const $close = $('.close')[0];
const $log = $('.tableItems');
const $dropdown = $('#maps');
$.jCanvas.defaults.fromCenter = false;

var rows;
var columns;

const canvasWidth = $map.width();
const canvasHeight = $map.height();
var boxWidth;
var boxHeight;

const USER_BOT_COLOR = "#3333ff";
const LIGHT_USER_BOT_COLOR = "#9999ff";
const AUTO_BOT_COLOR = "#ff3d5d";
const LIGHT_AUTO_BOT_COLOR = "#ff9eae";
const TEAM_COLOR = "#ffff7f";
const LIGHT_TEAM_COLOR = "#ffff7f";
const CELL_COLOR = "black";
const EXPLORED_COLOR = "white";
const WALL_COLOR = "black";
const TEMP_COLOR = "#33ff70";
const LIGHT_TEMP_COLOR = "#99ffb7";
const VICTIM_COLOR = "red";
const HAZARD_COLOR = "yellow";

var grid;
var autoBot;
var mapPaths = ["src/sample-map.json", "src/data.json", "src/data1.json", "src/data3.json", "src/data4.json", "src/data6.json", "src/data7.json", "src/data8.json", "src/data9.json", "src/data10.json", "src/data11.json", "src/data12.json", "src/data13.json", "src/data14.json"];
var pathIndex = 2;
var currentPath = mapPaths[pathIndex];
var globalPrevious1;
var trackLoop = [];

var count = 0;
var waitCount = 10;
var seconds = 0;
var timeout;
var eventListenersAdded = false;
var pause = false;

$(document).ready(function() {
    startTime = new Date();
    
    $('.body-container').css('visibility', 'hidden');
    $('.body-container').css('opacity', '0');
    $('.loader').css('visibility', 'visible');
    $('.loader').css('opacity', '1');

    createMap(currentPath, function loop() {
        $('.loader').css('visibility', 'hidden');
        $('.body-container').css('visibility', 'visible');
        $('.body-container').css('opacity', '1');

        if (!eventListenersAdded) {
            // document arrow keys event listener
            $(document).on('keydown', function(e) {
                eventKeyHandlers(e);
            });
            eventListenersAdded = true;
        }

        requestAnimationFrame(loop);

        // set speed
        if (++count < waitCount) {
            return;
        }

        count = 0;

        if (!pause) {
            move(autoBot);
            updateScrollingPosition(grid[autoBot.loc]);
        }
    });

    requestAnimationFrame(loop);
});

function move(bot) {
    let previousCell = bot.loc;

    // exploration steps
    mark(previousCell);
    let newLoc = navigate(bot, previousCell);
    console.log(grid[newLoc])

    if (newLoc == null) return;
    else if (grid[newLoc].loopTrace.previous == previousCell) {
        // pause = true;
        if (trackLoop.includes(newLoc)) {
            pause = true;
        } else {
            if (!grid[newLoc].explored) {
                console.log("covering")
                grid[previousCell].visited = true;
                trackLoop = [];
                globalPrevious1 = autoBot.loc;
                autoBot.loc = grid[previousCell].loopTrace.previous;
            }
            trackLoop.push(newLoc);
        }
        console.log("loop detected. stopping...");
    } else {
        globalPrevious1 = autoBot.loc;
        autoBot.loc = newLoc;
    }

    // marking for loop detection
    grid[previousCell].loopTrace.id = bot.id;
    grid[previousCell].loopTrace.next = newLoc;
    grid[newLoc].loopTrace.previous = globalPrevious1;

    // render
    drawMap([grid[previousCell]]);
    spawn(bot);
}

function loopDetected(bot, loc) {
    let newLoc = navigate(bot, loc);
    grid[newLoc].loopMark = bot.id;
    trackLoop.push(newLoc);
}

// marking step
function mark(loc) {
    if (!isBlockingPath(loc)) {
        grid[loc].visited = true;
    } else {
        grid[loc].explored = true;
    }

    /* let top = loc - 1, bottom = loc + 1, left = loc - rows, right = loc + rows;

    if (((exists(top) && (!top.isWall || !top.visited)) && (exists(bottom) && (!bottom.isWall || !bottom.visited))) || ((exists(left) && (!left.isWall || !left.visited)) && (exists(right) && (!right.isWall || !right.visited)))) {
        grid[loc].explored = true;
    } else {
        grid[loc].visited = true;
    } */
}

// blocking path if at least two of the immediate diagonal cells are inaccessible
function isBlockingPath(loc) {
    // my first
    /* let topLeft = loc - rows - 1;
    let topRight = loc + rows - 1;
    let bottomLeft = loc - rows + 1;
    let bottomRight = loc + rows + 1;
    let inaccessibleCount = 0;

    if (topLeft > 0 && (grid[topLeft].isWall || grid[topLeft].visited)) inaccessibleCount++;
    if (topRight < grid.length && (grid[topRight].isWall || grid[topRight].visited)) inaccessibleCount++;
    if (bottomLeft > 0 && (grid[bottomLeft].isWall || grid[bottomLeft].visited)) inaccessibleCount++;
    if (bottomRight < grid.length && (grid[bottomRight].isWall || grid[bottomRight].visited)) inaccessibleCount++;

    return inaccessibleCount > 1; */

    // pair programmed
    /* let top = loc - 1, bottom = loc + 1, left = loc - rows, right = loc + rows;

    if ((((exists(top) && (!top.isWall || !top.visited)) && (exists(bottom) && (!bottom.isWall || !bottom.visited)))
    || (((exists(left) && (!left.isWall || !left.visited)) && (exists(right) && (!right.isWall || !right.visited)))) {
        grid[loc].explored = true;
    } else {
        grid[loc].visited = true;
    } */

    let top = loc - 1, bottom = loc + 1, left = loc - rows, right = loc + rows;
    let topLeft = loc - rows - 1, topRight = loc + rows - 1, bottomLeft = loc - rows + 1, bottomRight = loc + rows + 1;
    let toCheck = [topLeft, topRight, bottomLeft, bottomRight];
    let toCheck2 = [];
    let diagonalInaccessible = 0, straightInaccessible = 0;

    // 3rd try - corner = immediate diagonal cell
    if (exists(top) && (grid[top].isWall || grid[top].visited)) {   // if top is inaccessible, don't check top left and top right
        if (toCheck.includes(topLeft)) toCheck.splice(toCheck.indexOf(topLeft), 1);
        if (toCheck.includes(topRight)) toCheck.splice(toCheck.indexOf(topRight), 1);
        straightInaccessible++;
    }
    if (exists(bottom) && (grid[bottom].isWall || grid[bottom].visited)) {  // if bottom is inaccessible, don't check bottom left and bottom right
        if (toCheck.includes(bottomLeft)) toCheck.splice(toCheck.indexOf(bottomLeft), 1);
        if (toCheck.includes(bottomRight)) toCheck.splice(toCheck.indexOf(bottomRight), 1);
        straightInaccessible++;
    }
    if (exists(left) && (grid[left].isWall || grid[left].visited)) {    // if left is inaccessible, don't check top left and bottom left
        if (toCheck.includes(topLeft)) toCheck.splice(toCheck.indexOf(topLeft), 1);
        if (toCheck.includes(bottomLeft)) toCheck.splice(toCheck.indexOf(bottomLeft), 1);
        straightInaccessible++;
    }
    if (exists(right) && (grid[right].isWall || grid[right].visited)) { // if right is inaccessible, don't check top right and bottom right
        if (toCheck.includes(topRight)) toCheck.splice(toCheck.indexOf(topRight), 1);
        if (toCheck.includes(bottomRight)) toCheck.splice(toCheck.indexOf(bottomRight), 1);
        straightInaccessible++;
    }

    if (straightInaccessible == 3) return false;
    
    if (toCheck.length == 0) return true;   // if all corners are inaccessible, you're blocking the way

    for (const cell of toCheck) {
        if (grid[cell].isWall || grid[cell].visited) diagonalInaccessible++;
    }

    if (toCheck.length < 3) return diagonalInaccessible > 0;   // if you're not checking all corners and at least one cell is inaccessible, you're blocking the way
    else return diagonalInaccessible > 1;  // if you're checking all corners and more than one cell are inaccessible, you're blocking the way
}

function exists(loc) {
    return loc >= 0 && loc < grid.length;
}

function navigate(bot, loc) {
    let top = loc - 1;
    let bottom = loc + 1;
    let left = loc - rows;
    let right = loc + rows;

    let news = [loc - 1, loc + 1, loc - rows, loc + rows];  // north, east, west, south cells

    let explored = [], unexplored = [];

    for (const cell of news) {
        if (cell >= 0 && cell < grid.length && !grid[cell].isWall && !grid[cell].visited) {
            if (grid[cell].explored) explored.push(cell);
            else unexplored.push(cell);
        }
    }

    if (unexplored.length > 0) {
        let temp = goToUnexplored(unexplored);
        // if (grid[temp].loopTrace.previous == loc) {
        //     loopDetected(bot);
        //     return;
        // } else {

            // globalPrevious1 = autoBot.loc;
            // autoBot.loc = temp;

        // }
        return temp;
    } else if (explored.length > 0) {
        let temp = goToExplored(explored);
        // if (grid[temp].loopTrace.previous == loc) {
        //     loopDetected(bot);
        //     return;
        // } else {

            // globalPrevious1 = autoBot.loc;
            // autoBot.loc = temp;

        // }
        return temp;
    } else {
        pause = true;
        console.log("done.");
    }
}

/**
 * for each of the unexplored cells see how many wall or visited cells are around it
 * then go to the cell with most of them, which is most likely to be marked as visited
 * in the marking step
 */
function goToUnexplored(unexplored) {
    let numInaccessible = 0, highest = -1, highestID, border = [];
    for (const loc of unexplored) {
        border = findBorder(loc);
        for (const neighbour of border) {
            if (neighbour.isWall || neighbour.visited) numInaccessible++;
        }
        if (numInaccessible > highest) {
            highest = numInaccessible;
            highestID = loc;
        }
        numInaccessible = 0;
    }
    trackLoop = [];
    return highestID;
}

/**
 * go to one of the four cells (N, E, S, W) that are explored.
 * Avoid selecting the cell where you came from unless it is the only candidate.
 * Instead select the first explored cell in an ordered list of adjacent cells
 */
function goToExplored(explored) {
    if (explored.length > 1) {
        for (const cell of explored) {
            if (cell != globalPrevious1) return cell;
        }
    }
    // grid[explored[0]].visited = true;   // EXPERIMENTAL
    // drawMap([grid[explored[0]]]);
    return explored[0];
}

// find the 8 surroundings cells of a given cell
function findBorder(loc) {
    return [grid[loc - rows - 1], grid[loc - 1], grid[loc + rows - 1], 
    grid[loc + rows], grid[loc + rows + 1], grid[loc + 1], 
    grid[loc - rows + 1], grid[loc - rows]];
}

/* function loopDetected(bot) {
    console.log(`loop detected.`);
    // pause = true;
    loopControl(bot);
}

function loopControl(bot) {
    let loc = bot.loc;
    let trackedLocs = [];
    while (grid[loc].loopMark != bot.id) {
        if (grid[loc].loopTrace.next != null) {
            autoBot.loc = grid[loc].loopTrace.next;
        } else {
            break;
        }

        grid[loc].loopMark = autoBot.id;
        trackedLocs.push(loc);

        console.log("loop control 1");
        
        // render
        drawMap([grid[loc]]);
        spawn(autoBot);
    }

    console.log("reached beginning of loop");
    grid[autoBot.loc].visited = true;
    // render
    drawMap([grid[loc]]);
    spawn(autoBot);
    for (let i = trackedLocs.length - 1; i >= 0; i--) {
        autoBot.loc = trackedLocs[i];
        grid[autoBot.loc].visited = true;
        // render
        drawMap([grid[loc]]);
        spawn(autoBot);
        grid[trackedLocs[i]].loopMark = null;
    }
} */

function eventKeyHandlers(e) {
    switch (e.keyCode) {
        case 67:    // c
            e.preventDefault();
            updateScrollingPosition(grid[autoBot.loc]);
            break;
        case 72:    // h
            e.preventDefault();
            $mapContainer.scrollLeft($mapContainer.scrollLeft() - 50);
            break;
        case 74:    // j
            e.preventDefault();
            $mapContainer.scrollTop($mapContainer.scrollTop() + 50);
            break;
        case 75:    // k
            e.preventDefault();
            $mapContainer.scrollTop($mapContainer.scrollTop() - 50);
            break;
        case 76:    // l
            e.preventDefault();
            $mapContainer.scrollLeft($mapContainer.scrollLeft() + 50);
            break;
        default:    // nothing
            break;
    }
}

function updateScrollingPosition(loc) {
    let x = loc.x * boxWidth;
    let y = loc.y * boxHeight;
    $mapContainer[0].scroll(x - $mapContainer.width()/2, y - $mapContainer.height()/2);
}

function updateTime() {
    seconds++;
    $timer.text(seconds);
}

// creates an array containing cells with x and y positions and additional details
function createMap(currentPath, cb) {
    grid = [];

    $.getJSON(currentPath, data => {
        rows = data.dimensions[0].rows;
        columns = data.dimensions[0].columns;
        boxWidth = canvasWidth/rows;
        boxHeight = canvasHeight/columns;
        $.each(data.map, (i, value) => {
            grid.push({ x: value.x, y: value.y,
                isWall: value.isWall == "true", explored: false, visited: false,
                loopTrace: { id: null, previous: null, next: null }, loopMark: { id: null } });
        });
    }).fail(() => {
        alert("An error has occured.");
    }).done(() => {
        autoBot = { id: "agent1", loc: 482/* getRandomLoc(grid) */, color: TEMP_COLOR, dir: 1 };
        /* victim1 = {id: "victim", loc: getRandomLoc(grid), color: VICTIM_COLOR, isFound: false};
        victim2 = {id: "victim", loc: getRandomLoc(grid), color: VICTIM_COLOR, isFound: false};
        hazard1 = {id: "hazard", loc: getRandomLoc(grid), color: HAZARD_COLOR, isFound: false};
        hazard2 = {id: "hazard", loc: getRandomLoc(grid), color: HAZARD_COLOR, isFound: false};
        obstacles.push(victim1, hazard1, hazard2); */

        drawMap(grid);
        spawn(autoBot);
        console.log(autoBot.loc);

        timeout = setInterval(updateTime, 1000);

        updateScrollingPosition(grid[autoBot.loc]);

        cb(grid);
    });
}

function drawMap(grid) {
    for (const cell of grid) {
        if (cell.isWall) {
            $map.drawRect({
                fillStyle: 'black',
                strokeStyle: 'white',
                strokeWidth: 1,
                cornerRadius: 2,
                x: cell.x*boxWidth, y: cell.y*boxHeight,
                width: boxWidth - 1, height: boxHeight - 1
            });
        } else if (cell.explored && !cell.visited) {
            $map.drawRect({
                fillStyle: 'grey',
                x: cell.x*boxWidth, y: cell.y*boxHeight,
                width: boxWidth - 1, height: boxHeight - 1
            });
        } else if (cell.visited) {
            $map.drawRect({
                fillStyle: 'red',
                x: cell.x*boxWidth, y: cell.y*boxHeight,
                width: boxWidth - 1, height: boxHeight - 1
            });
        } else if (!cell.visited && !cell.explored) {
            $map.drawRect({
                fillStyle: 'black',
                x: cell.x*boxWidth, y: cell.y*boxHeight,
                width: boxWidth - 1, height: boxHeight - 1
            });
        }
    }
}

// spawns the bots in their locations
// size - scale factor
function spawn(bot) {
    /* let bot;
    for (let i = 0; i < members.length; i++) {
        bot = members[i]
        if (bot.id == "human" || bot.id == "agent") {
            $map.drawRect({
                fillStyle: bot.color,
                x: grid[bot.loc].x*boxWidth, y: grid[bot.loc].y*boxHeight,
                width: (boxWidth - 1)*size, height: (boxHeight - 1)*size
            });
        } else if (bot.id == "victim") {
            $map.drawEllipse({
                fromCenter: true,
                fillStyle: bot.color,
                x: grid[bot.loc].x*boxWidth + boxWidth/2, y: grid[bot.loc].y*boxHeight + boxHeight/2,
                width: (boxWidth - 1)*size, height: (boxHeight - 1)*size
            });
        } else if (bot.id == "hazard") {
            $map.drawPolygon({
                fromCenter: true,
                fillStyle: bot.color,
                x: grid[bot.loc].x*boxWidth + boxWidth/2, y: grid[bot.loc].y*boxHeight + boxHeight/2,
                radius: ((boxWidth - 1)/2)*size,
                sides: 3
            });
        }
    } */
    $map.drawRect({
        fillStyle: bot.color,
        x: grid[bot.loc].x*boxWidth, y: grid[bot.loc].y*boxHeight,
        width: (boxWidth - 1), height: (boxHeight - 1)
    });
}

// gets a random spawn location for the robot
function getRandomLoc(grid) {
    let botIndex;
    do {
        botIndex = Math.floor(Math.random() * grid.length);
    } while(grid[botIndex].isWall);
    return botIndex;
}
