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
var botExplored = new Set();
var tempBotExplored = new Set();
var data;
var autoBot;
var victim1, victim2, hazard1, hazard2; // come back
var obstacles;
var openList;
var closedList;
var pathToGoal;
var mapPaths = ["src/sample-map.json", "src/data.json", "src/data1.json", "src/data3.json", "src/data4.json", "src/data6.json", "src/data7.json", "src/data8.json", "src/data9.json", "src/data10.json", "src/data11.json", "src/data12.json", "src/data13.json", "src/data14.json"];
var pathIndex = 8;
var currentPath = mapPaths[pathIndex];

var viewRadius = 0;
var count = 0;
var waitCount = 0;
var step = 0;
var seconds = 0;
var timeout;
var eventListenersAdded = false;
var pause = false;
var botLeft, botRight, botTop, botBottom;
var intervalCount = 0;
var log = [];
var startTime;

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
            let previous = autoBot.loc;
            mark(autoBot.loc);
            navigate(autoBot.loc);
            drawMap([grid[previous]]);
            spawn([autoBot], 1);
            console.log(grid[previous], grid[autoBot.loc])
        }
    });

    requestAnimationFrame(loop);
});

function mark(loc) {
    if (!isBlockingPath(loc)) {
        grid[loc].visited = true;
    } else {
        grid[loc].explored = true;
    }
}

// blocking path if at least two of the immediate diagonal cells are inaccessible
function isBlockingPath(loc) {
    let topLeft = loc - rows - 1;
    let topRight = loc + rows - 1;
    let bottomLeft = loc - rows + 1;
    let bottomRight = loc + rows + 1;
    let inaccessibleCount = 0;

    if (topLeft > 0 && (grid[topLeft].isWall || grid[topLeft].visited)) inaccessibleCount++;
    if (topRight < grid.length && (grid[topRight].isWall || grid[topRight].visited)) inaccessibleCount++;
    if (bottomLeft > 0 && (grid[bottomLeft].isWall || grid[bottomLeft].visited)) inaccessibleCount++;
    if (bottomRight < grid.length && (grid[bottomRight].isWall || grid[bottomRight].visited)) inaccessibleCount++;

    return inaccessibleCount > 1;
}

function navigate(loc) {
    let top = loc - 1;
    let bottom = loc + 1;
    let left = loc - rows;
    let right = loc + rows;

    let news = [loc - 1, loc + 1, loc - rows, loc + rows];  // north, east, west, south cells

    let explored = [], unexplored = [];

    for (const cell of news) {
        if (cell > 0 && cell < grid.length && !grid[cell].isWall && !grid[cell].visited) {
            if (grid[cell].explored) explored.push(cell);
            else unexplored.push(cell);
        }
    }

    /* if (top > 0 && !grid[top].isWall && grid[top].explored && !grid[top].visited) explored.push(top);
    else unexplored.push(top);
    if (left > 0 && !grid[left].isWall && grid[left].explored && !grid[top].visited) explored.push(left);
    else unexplored.push(left);
    if (bottom < grid.length && !grid[bottom].isWall && grid[bottom].explored && !grid[top].visited) explored.push(bottom);
    else unexplored.push(bottom);
    if (right < grid.length && !grid[right].isWall && grid[right].explored && !grid[top].visited) explored.push(right);
    else unexplored.push(right); */

    if (unexplored.length > 0) {
        autoBot.loc = goToUnexplored(unexplored);
        console.log("unexplored. moving...");
    } else if (explored.length > 0) {
        autoBot.loc = goToExplored(explored);
        console.log("explored. moving...");
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
    return highestID;
}

/**
 * go to one of the four cells (N, E, S, W) that are explored.
 * Avoid selecting the cell where you came from unless it is the only candidate.
 * Instead select the first explored cell in an ordered list of adjacent cells
 */
function goToExplored(explored) {
    return explored[0];
}

// find the 8 surroundings cells of a given cell
function findBorder(loc) {
    return [grid[loc - rows - 1], grid[loc - 1], grid[loc + rows - 1], 
    grid[loc + rows], grid[loc + rows + 1], grid[loc + 1], 
    grid[loc - rows + 1], grid[loc - rows]];
}

$(window).on("load", () => {
    $.each(mapPaths, (i, path) => {
        $dropdown.append($('<option></option>').val(i).html(path));
    });
    $dropdown.prop('selectedIndex', pathIndex);
});

$("#maps").change(() => {
    currentPath = $("#maps option:selected").text();
    $map.clearCanvas();
    clearInterval(timeout);
    createMap(currentPath);
    toggleModal();
});

function eventKeyHandlers(e) {
    switch (e.keyCode) {
        case 67:    // c
            e.preventDefault();
            updateScrollingPosition(grid[autoBot.loc]);
            console.log("Shifted focus to agent", performance.now());
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

function toggleModal() {
    if ($modal.css('display') == 'none') $modal.css('display', 'block');
    else $modal.css('display', 'none');
}

function closeModal() {
    $modal.css('display', 'none');
}

function terminate() {
    pause = true;
    clearInterval(timeout);
    data.decisions = log;
    data.obstacles = obstacles;
    // console.log(data);
    $.post("/simulation", data, res => console.log(res))
    .fail(() => alert("POST failed"));
    window.location.href = "/stats";
}

function showExploredInfo() {
    spawn(obstacles, 10);

    $(document).off();
    
    $popupModal.css('display', 'block');
    $popupModal.css('visibility', 'visible');
    $popupModal.css('opacity', '1');
    $minimapImage.attr("src", $map.getCanvasImage());
    $botImage.attr("src", $map.getCanvasImage());

    if (log[intervalCount - 1] != null) {
        let chosenOption = (log[intervalCount - 1].trusted) ? "Integrated" : "Discarded";
        if (chosenOption == "Integrated") {
            $log.append(`<p style='background-color: #99ffb7;'>${intervalCount} - ${chosenOption}</p>`);
        } else {
            $log.append(`<p style='background-color: #ff9eae;'>${intervalCount} - ${chosenOption}</p>`);
        }
    }

    getSetBoundaries(tempBotExplored, 1);
    scaleImages();

    pause = true;
    clearInterval(timeout);

    setTimeout(() => { $popupModal.scrollTop(-10000) }, 500);
    setTimeout(() => { $log.scrollLeft(10000) }, 500);
}

// redraw the map and hide pop-up
function hideExploredInfo() {
    tempBotExplored.clear();

    refreshMap();

    $(document).on('keydown', function(e) {
        eventKeyHandlers(e);
    });

    $popupModal.css('visibility', 'hidden');
    $popupModal.css('display', 'none');
    $popupModal.css('opacity', '0');
    clearInterval(timeout);
    timeout = setInterval(updateTime, 1000);
    pause = false;
}

function confirmExploredArea() {
    tempBotExplored.forEach(item => {
        grid[item].isBotExplored = true;
        botExplored.add(item);
    });
    log.push({interval: intervalCount++, trusted: true});
    hideExploredInfo();
}

function undoExploration() {
    log.push({interval: intervalCount++, trusted: false});
    hideExploredInfo();
}

function updateScrollingPosition(loc) {
    let x = loc.x * boxWidth;
    let y = loc.y * boxHeight;
    $mapContainer[0].scroll(x - $mapContainer.width()/2, y - $mapContainer.height()/2);
}

function updateTime() {
    seconds++;
    if (seconds % 1000 == 0) {
        seconds = 0;
        showExploredInfo();
    }
    $timer.text(seconds);
}

// creates an array containing cells with x and y positions and additional details
function createMap(currentPath, cb) {
    grid = [];
    data = {agentData: [], decisions: [], obstacles: []};
    tempBotExplored.clear();
    botExplored.clear();
    log = [];
    $log.empty();
    step = 0;
    pathToGoal = [];
    obstacles = [];
    openList = [];
    closedList = [];

    $.getJSON(currentPath, data => {
        rows = data.dimensions[0].rows;
        columns = data.dimensions[0].columns;
        boxWidth = canvasWidth/rows;
        boxHeight = canvasHeight/columns;
        $.each(data.map, (i, value) => {
            grid.push({ x: value.x, y: value.y, isWall: value.isWall == "true", isHumanExplored: false, isBotExplored: false, explored: false, visited: false });
        });
    }).fail(() => {
        alert("An error has occured.");
    }).done(() => {
        autoBot = {id: "agent", loc: 151166/* getRandomLoc(grid) */, color: AUTO_BOT_COLOR, dir: 1};
        victim1 = {id: "victim", loc: 143650/* getRandomLoc(grid) */, color: VICTIM_COLOR, isFound: false};
        victim2 = {id: "victim", loc: getRandomLoc(grid), color: VICTIM_COLOR, isFound: false};
        hazard1 = {id: "hazard", loc: getRandomLoc(grid), color: HAZARD_COLOR, isFound: false};
        hazard2 = {id: "hazard", loc: getRandomLoc(grid), color: HAZARD_COLOR, isFound: false};
        obstacles.push(victim1, /* victim2, */ hazard1, hazard2);

        drawMap(grid);
        spawn([autoBot, victim1, /* victim2, */ hazard1, hazard2], 1);

        console.log("Spawn", performance.now(), autoBot.loc);

        tracker = { loc: autoBot.loc, timestamp: performance.now() };
        data.agentData.push(tracker);
        console.log(tracker);

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

// draw a square given a cell
function draw(cell) {
    let lightColor = LIGHT_TEMP_COLOR, darkColor = TEMP_COLOR;

    if (cell.isHumanExplored && !cell.isBotExplored) {
        lightColor = LIGHT_USER_BOT_COLOR;
        darkColor = USER_BOT_COLOR;
    } else if (cell.isBotExplored && !cell.isHumanExplored) {
        lightColor = LIGHT_AUTO_BOT_COLOR;
        darkColor = AUTO_BOT_COLOR;
    } else if (cell.isHumanExplored && cell.isBotExplored) {
        lightColor = LIGHT_TEAM_COLOR;
        darkColor = TEAM_COLOR;
    }

    if (cell.isWall) {
        $map.drawRect({
            fillStyle: WALL_COLOR,
            strokeStyle: darkColor,
            strokeWidth: 1,
            cornerRadius: 2,
            x: cell.x*boxWidth, y: cell.y*boxHeight,
            width: boxWidth - 1, height: boxHeight - 1
        });
    } else {
        $map.drawRect({
            fillStyle: lightColor,
            x: cell.x*boxWidth, y: cell.y*boxHeight,
            width: boxWidth - 1, height: boxHeight - 1
        });
    }
}

// spawns the bots in their locations
// size - scale factor
function spawn(members, size) {
    let bot;
    for (let i = 0; i < members.length; i++) {
        bot = members[i]
        if (bot.id == "human" || bot.id == "agent") {
            $map.drawRect({
                fillStyle: bot.color,
                x: grid[bot.loc].x*boxWidth, y: grid[bot.loc].y*boxHeight,
                width: (boxWidth - 1)*size, height: (boxHeight - 1)*size
            });
        } else if (bot.id == "victim"/*  && bot.isFound */) {
            $map.drawEllipse({
                fromCenter: true,
                fillStyle: bot.color,
                x: grid[bot.loc].x*boxWidth + boxWidth/2, y: grid[bot.loc].y*boxHeight + boxHeight/2,
                width: (boxWidth - 1)*size, height: (boxHeight - 1)*size
            });
        } else if (bot.id == "hazard"/*  && bot.isFound */) {
            $map.drawPolygon({
                fromCenter: true,
                fillStyle: bot.color,
                x: grid[bot.loc].x*boxWidth + boxWidth/2, y: grid[bot.loc].y*boxHeight + boxHeight/2,
                radius: ((boxWidth - 1)/2)*size,
                sides: 3
            });
        }
    }
}

// redraws the map and spawns the bots in their new location
function refreshMap() {
    // bot surroundings
    let botFOV = findLineOfSight(autoBot);
    let botFOVSet = new Set(botFOV);    // convert array to set

    botFOVSet.forEach(item => {
        tempBotExplored.add(item);
        draw(grid[item]);

        for (let j = 0; j < obstacles.length; j++) {
            if (item == obstacles[j].loc) {
                obstacles[j].isFound = true;
            }
        }
    });

    for (let i = 0; i < pathToGoal.length; i++) {
        let cell = pathToGoal[i];
        $map.drawRect({
            fillStyle: 'green',
            x: cell.x*boxWidth, y: cell.y*boxHeight,
            width: boxWidth - 1, height: boxHeight - 1
        });
    }

    spawn([autoBot, victim1, /* victim2, */ hazard1, hazard2], 1);
}

// 0 - human, 1 - bot
function getSetBoundaries(thisSet, who) {
    if (who == 1) {
        let setIterator = thisSet.values();
        let firstElement = setIterator.next().value;
        botLeft = grid[firstElement].x;
        botRight = grid[firstElement].x;
        botTop = grid[firstElement].y;
        botBottom = grid[firstElement].y;

        for (let i = setIterator.next().value; i != null; i = setIterator.next().value) {
            if (grid[i].x < botLeft) botLeft = grid[i].x;
            if (grid[i].x > botRight) botRight = grid[i].x;
            if (grid[i].y < botTop) botTop = grid[i].y;
            if (grid[i].y > botBottom) botBottom = grid[i].y;
        }
    }
}

function scaleImages() {
    let botWidth = columns/(botRight - botLeft + 5) * 100;
    let botHeight = rows/(botBottom - botTop + 5) * 100;

    botWidth = (botWidth < 100) ? 100 : botWidth;
    botHeight = (botHeight < 100) ? 100 : botHeight;

    if (botWidth > botHeight) {
        $botImage.attr("width", botHeight + "%");
        $botImage.attr("height", botHeight + "%");
    } else {
        $botImage.attr("width", botWidth + "%");
        $botImage.attr("height", botWidth + "%");
    }
    
    $botImage.parent()[0].scroll((botLeft + (botRight - botLeft + 1)/2)*($botImage.width()/columns) - $('.explored').width()/2, ((botTop + (botBottom - botTop + 1)/2)*($botImage.height()/rows)) - $('.explored').height()/2);
}

function findLineOfSight(bot) {
    let thisSurroundings = [[], [], [], []];
    let centerX = grid[bot.loc].x;
    let centerY = grid[bot.loc].y;
    let i = 0, j = 0;

    // quadrant 1
    for (let y = centerY; y >= centerY - viewRadius; y--) {
        for (let x = centerX; x <= centerX + viewRadius; x++) {
            thisSurroundings[0].push({x: i, y: j, loc: y + x*rows});
            i++;
        }
        i = 0;
        j++;
    }

    i = 0, j = 0;

    // quadrant 2
    for (let y = centerY; y >= centerY - viewRadius; y--) {
        for (let x = centerX; x >= centerX - viewRadius; x--) {
            thisSurroundings[1].push({x: i, y: j, loc: y + x*rows});
            i++;
        }
        i = 0;
        j++;
    }

    i = 0, j = 0;

    // quadrant 3
    for (let y = centerY; y <= centerY + viewRadius; y++) {
        for (let x = centerX; x >= centerX - viewRadius; x--) {
            thisSurroundings[2].push({x: i, y: j, loc: y + x*rows});
            i++;
        }
        i = 0;
        j++;
    }

    i = 0, j = 0;

    //quadrant 4
    for (let y = centerY; y <= centerY + viewRadius; y++) {
        for (let x = centerX; x <= centerX + viewRadius; x++) {
            thisSurroundings[3].push({x: i, y: j, loc: y + x*rows});
            i++;
        }
        i = 0;
        j++;
    }

    return castRays(thisSurroundings);
}

// arr has quadrant one ([0]), quadrant two ([1]), quadrant three ([2]), quadrant four ([3]).
function castRays(arr) {
    let mySurroundings = [];
    // quadrant 1
    for (let i = viewRadius; i < arr[0].length; i += viewRadius + 1) {
        mySurroundings = mySurroundings.concat(bresenhams(arr[0][0], arr[0][i], 1, arr[0]));
    }
    for (let i = arr[0].length - viewRadius - 1; i < arr[0].length - 1; i++) {
        mySurroundings = mySurroundings.concat(bresenhams(arr[0][0], arr[0][i], 1, arr[0]));
    }

    // quadrant 2
    for (let i = viewRadius; i < arr[1].length; i += viewRadius + 1) {
        mySurroundings = mySurroundings.concat(bresenhams(arr[1][0], arr[1][i], 2, arr[1]));
    }
    for (let i = arr[1].length - viewRadius - 1; i < arr[1].length - 1; i++) {
        mySurroundings = mySurroundings.concat(bresenhams(arr[1][0], arr[1][i], 2, arr[1]));
    }

    // quadrant 3
    for (let i = viewRadius; i < arr[2].length; i += viewRadius + 1) {
        mySurroundings = mySurroundings.concat(bresenhams(arr[2][0], arr[2][i], 3, arr[2]));
    }
    for (let i = arr[2].length - viewRadius - 1; i < arr[2].length - 1; i++) {
        mySurroundings = mySurroundings.concat(bresenhams(arr[2][0], arr[2][i], 3, arr[2]));
    }

    // quadrant 4
    for (let i = viewRadius; i < arr[3].length; i += viewRadius + 1) {
        mySurroundings = mySurroundings.concat(bresenhams(arr[3][0], arr[3][i], 4, arr[3]));
    }
    for (let i = arr[3].length - viewRadius - 1; i < arr[3].length - 1; i++) {
        mySurroundings = mySurroundings.concat(bresenhams(arr[3][0], arr[3][i], 4, arr[3]));
    }

    return mySurroundings;
}

function getCell(x, y, grid) {
    for (let i = 0; i < grid.length; i++) {
        if (grid[i].x == x && grid[i].y == y) return grid[i];
    }
    return null;
}

function bresenhams(cell1, cell2, quad, thisGrid) {
    let x1 = cell1.x, y1 = cell1.y, x2 = cell2.x, y2 = cell2.y;

    let dx = x2 - x1, dy = y2 - y1;
    let m = dy/dx;
    let p;

    let arr = [];
    arr.push(getCell(x1, y1, thisGrid).loc);
    if (m >= 0 && m <= 1) {
        p = (2*dy) - dx;
        while (x1 < x2) {
            if (p < 0) {
                x1++;
                p += 2*dy;
                arr.push(getCell(x1, y1, thisGrid).loc)
                if (grid[getCell(x1, y1, thisGrid).loc].isWall) break;
            } else {
                x1++;
                y1++;
                p += 2*(dy - dx);
                arr.push(getCell(x1, y1, thisGrid).loc);
                if (grid[getCell(x1, y1, thisGrid).loc].isWall) break;
            }
        }
    } else if (m > 1) {
        p = (2*dx) - dy;
        while (y1 < y2) {
            if (p < 0) {
                y1++;
                p += 2*dx;
                arr.push(getCell(x1, y1, thisGrid).loc);
                if (grid[getCell(x1, y1, thisGrid).loc].isWall) break;
            } else {
                x1++;
                y1++;
                p += 2*(dx - dy);
                arr.push(getCell(x1, y1, thisGrid).loc);
                if (grid[getCell(x1, y1, thisGrid).loc].isWall) break;
            }
        }
    }
    // console.log(cell1, cell2, arr, thisGrid);
    return arr;
}

// top, bottom, left, right
function findNeighbours(grid, node) {
    let ret = [];
    let loc = node.loc;

    if (!(loc - rows < 0)) {
        ret.push(grid[loc - rows]);
    }
    if (!(loc - 1 < 0)) {
        ret.push(grid[loc - 1]);
    }
    if (!(loc + rows > grid.length - 1)) {
        ret.push(grid[loc + rows]);
    }
    if (!(loc + 1 > grid.length - 1)) {
        ret.push(grid[loc + 1]);
    }

    return ret;
}

// takes the new grid size and modifies the map
function modifyMap() {
    let rowsInput = $('#rows').value;
    let columnsInput = $('#columns').value;
    if (!(isValidNumber(rowsInput) && isValidNumber(columnsInput))) {
        alert("Incorrect input. Please enter a positive integer.");
        return;
    }
    rows = parseInt(rowsInput);
    columns = parseInt(columnsInput);
    createMap();
    autoBot.loc = getRandomLoc();
    refreshMap();
}

// sets the speed of the autonomous bot
function setSpeed() {
    let speed = $('speed').value;
    if (!isValidNumber(speed)) {
        alert("Incorrect input. Please enter a positive integer.");
        return;
    }
    waitCount = parseInt(speed);
}

// checks if the parameter is a valid positive integer
function isValidNumber(str) {
    return /^\s*\d+\s*$/.test(str);
}

// gets a random spawn location for the robot
function getRandomLoc(grid) {
    let botIndex;
    do {
        botIndex = Math.floor(Math.random() * grid.length);
    } while(grid[botIndex].isWall);
    return botIndex;
}
