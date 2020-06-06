import {Logic} from './logic-solver.js'
const LS = Logic

const SUDOKU_DIMENSION_SIZE = 9;
const SUDOKU_BLOCK_WIDTH = 3;
function add_sudoku_constraints(solver, gridVars) {
  // require distinct digits in rows
  for (var row = 0; row < SUDOKU_DIMENSION_SIZE; row++) {
    for (var a = 0; a < SUDOKU_DIMENSION_SIZE; a++) {
      //for (var b = 0; b < SUDOKU_DIMENSION_SIZE; b++) {
      //  if (a == b) continue;
      for (var b = a+1; b < SUDOKU_DIMENSION_SIZE; b++) {
        solver.forbid(LS.equalBits(gridVars[row][a], gridVars[row][b]));
      }
    }
  }

  // require distinct digits in columns
  for (var col = 0; col < SUDOKU_DIMENSION_SIZE; col++) {
    for (var a = 0; a < SUDOKU_DIMENSION_SIZE; a++) {
      //for (var b = 0; b < SUDOKU_DIMENSION_SIZE; b++) {
      //  if (a == b) continue;
      for (var b = a+1; b < SUDOKU_DIMENSION_SIZE; b++) {
        solver.forbid(LS.equalBits(gridVars[a][col], gridVars[b][col]));
      }
    }
  }

  // require distinct digits in blocks
  for (var block = 0; block < SUDOKU_DIMENSION_SIZE; block++) {
    var rowOffset = Math.floor(block/SUDOKU_BLOCK_WIDTH) * SUDOKU_BLOCK_WIDTH;
    var colOffset = (block%SUDOKU_BLOCK_WIDTH) * SUDOKU_BLOCK_WIDTH;

    for (var a = 0; a < SUDOKU_DIMENSION_SIZE; a++) {
      var cellA = gridVars[Math.floor(a/SUDOKU_BLOCK_WIDTH) + rowOffset][a%SUDOKU_BLOCK_WIDTH + colOffset];

      //for (var b = 0; b < SUDOKU_DIMENSION_SIZE; b++) {
      //  if (a == b) continue;
      for (var b = a+1; b < SUDOKU_DIMENSION_SIZE; b++) {
        var cellB = gridVars[Math.floor(b/SUDOKU_BLOCK_WIDTH) + rowOffset][b%SUDOKU_BLOCK_WIDTH + colOffset];
        solver.forbid(LS.equalBits(cellA, cellB));
      }
    }
  }

  // require that all digits are between 1 and 9 (both inclusive)
  for (var i = 0; i < SUDOKU_DIMENSION_SIZE; i++) {
    for (var j = 0; j < SUDOKU_DIMENSION_SIZE; j++) {
      solver.require(LS.greaterThanOrEqual(gridVars[i][j], LS.constantBits(1)));
      solver.require(LS.lessThanOrEqual(gridVars[i][j], LS.constantBits(9)));
    }
  }
}

function get_cell_number(row, col) {
  return row * SUDOKU_DIMENSION_SIZE + col;
}

function get_cell_coords(number) {
  // cache? create hashmap/object?
  return { row:Math.floor(number/SUDOKU_DIMENSION_SIZE), col:number%SUDOKU_DIMENSION_SIZE }
}

function expand_surrounding_cells(surroundingCells, newIslandCell, candidateIsland) {
  //var coords = get_cell_coords(val)
  var upperCell = newIslandCell - SUDOKU_DIMENSION_SIZE;
  var lowerCell = newIslandCell + SUDOKU_DIMENSION_SIZE;
  var leftCell  = newIslandCell - 1;
  var rightCell = newIslandCell + 1;
  if (upperCell >= 0 && !candidateIsland.has(upperCell)) {
    surroundingCells.add(upperCell)
  }
  if (lowerCell < SUDOKU_DIMENSION_SIZE*SUDOKU_DIMENSION_SIZE && !candidateIsland.has(lowerCell)) {
    surroundingCells.add(lowerCell)
  }
  if (newIslandCell%SUDOKU_DIMENSION_SIZE != 0 && !candidateIsland.has(leftCell)) {
    surroundingCells.add(leftCell)
  }
  if (newIslandCell%SUDOKU_DIMENSION_SIZE != SUDOKU_DIMENSION_SIZE-1 && !candidateIsland.has(rightCell)) {
    surroundingCells.add(rightCell)
  }
}

// get random item from a Set
function getRandomItem(set) {
    let items = Array.from(set);
    return items[Math.floor(Math.random() * items.length)];
}

function collectLinkedWaterCells(cell, waterCells, visited) {
  if (visited.has(cell)) {
    return
  }

  visited.add(cell)

  var upperCell = cell - SUDOKU_DIMENSION_SIZE
  if (waterCells.has(upperCell)) {
    collectLinkedWaterCells(upperCell, waterCells, visited)
  }

  var lowerCell = cell + SUDOKU_DIMENSION_SIZE
  if (waterCells.has(lowerCell)) {
    collectLinkedWaterCells(lowerCell, waterCells, visited)
  }

  var leftCell = cell - 1;
  if (cell % SUDOKU_DIMENSION_SIZE > 0 && waterCells.has(leftCell)) {
    collectLinkedWaterCells(leftCell, waterCells, visited)
  }

  var rightCell = cell + 1;
  if (cell % SUDOKU_DIMENSION_SIZE < SUDOKU_DIMENSION_SIZE-1 && waterCells.has(rightCell)) {
    collectLinkedWaterCells(rightCell, waterCells, visited)
  }
}

function are_water_cells_linked(waterCells) {
  if (waterCells.size == 0) return false;

  var start = waterCells.values().next().value
  var linkedCells = new Set()
  collectLinkedWaterCells(start, waterCells, linkedCells)

  return waterCells.size == linkedCells.size
}

function expand_to_island(row, col, grid, landCells, waterCells, cellToIslandMapping) {
  var newIslandCell = get_cell_number(row, col);
  if (landCells.has(newIslandCell)) return;

  var candidateIsland = new Set();
  var surroundingCells = new Set();
  while (candidateIsland.size < 3) {
    waterCells.delete(newIslandCell)
    candidateIsland.add(newIslandCell)
    if (!are_water_cells_linked(waterCells)) {
      candidateIsland.forEach(function(cell) {
        waterCells.add(cell)
      })
      return
    }

    expand_surrounding_cells(surroundingCells, newIslandCell, candidateIsland);

    var allSurroundingIslands = new Set()
    surroundingCells.forEach(function(cell) {
      if (cellToIslandMapping[cell]) {
        allSurroundingIslands.add(cellToIslandMapping[cell])
      }
    })

    if (allSurroundingIslands.size > 0) {
      var allSurroundingIslandsTotalLength = 0
      allSurroundingIslands.forEach(function(island) {
        allSurroundingIslandsTotalLength += island.size
      })

      if (candidateIsland.size + allSurroundingIslandsTotalLength >= SUDOKU_DIMENSION_SIZE) {
        // put back candidateIsland cells to waterCells
        candidateIsland.forEach(function(cell) {
          waterCells.add(cell)
        })
        return
      }

      // merge candidate island with surrounding islands and return
      candidateIsland.forEach(function(cell) {
        landCells.add(cell)
        cellToIslandMapping[cell] = candidateIsland
      })

      allSurroundingIslands.forEach(function(island) {
        island.forEach(function(cell) {
          candidateIsland.add(cell)
          cellToIslandMapping[cell] = candidateIsland
        })
      })
      return
    }

    newIslandCell = getRandomItem(surroundingCells)
    surroundingCells.delete(newIslandCell)
  }

  // add new island and return
  candidateIsland.forEach(function(cell) {
    landCells.add(cell)
    cellToIslandMapping[cell] = candidateIsland
  })
}

function generate_islands() {
  // all waters connected
  // all lands distinct value
  // #land-cells >= 37

  var landCells = new Set();
  var waterCells = new Set();

  var grid = [];
  for (var i = 0; i < SUDOKU_DIMENSION_SIZE; i++) {
    grid.push([]);
    for (var j = 0; j < SUDOKU_DIMENSION_SIZE; j++) {
      grid[i].push(0);
      waterCells.add(get_cell_number(i, j));
    }
  }

  var cellToIslandMapping = {}
  console.log('')
  console.log('start island generation')
  var attempts = 0
  while (landCells.size < 37) {
    //var row = Math.floor(Math.random() * SUDOKU_DIMENSION_SIZE);
    //var col = Math.floor(Math.random() * SUDOKU_DIMENSION_SIZE);
    var cell = getRandomItem(waterCells)
    var row = Math.floor(cell/SUDOKU_DIMENSION_SIZE)
    var col = cell%SUDOKU_DIMENSION_SIZE

    expand_to_island(row, col, grid, landCells, waterCells, cellToIslandMapping);

    attempts += 1
    if (attempts % 100 == 0) console.log('attempts', attempts)

    if (attempts > 200) {
      // restart
      landCells.forEach(function(cell) {
        waterCells.add(cell)
      })
      landCells.clear()
      cellToIslandMapping = {}
      attempts = 0
    }
  }
  console.log('attempts', attempts)
  console.log('done island generation')

  var allIslands = new Set()
  for(const cell in cellToIslandMapping) {
    allIslands.add(cellToIslandMapping[cell])
  }

  return allIslands
}

function create_grid_variables() {
  var gridVars = [];

  for (var i = 0; i < SUDOKU_DIMENSION_SIZE; i++) {
    gridVars.push([])
    for (var j = 0; j < SUDOKU_DIMENSION_SIZE; j++) {
      gridVars[i].push(LS.variableBits(String(i)+String(j), 4))
    }
  }

  return gridVars;
}

function print_grid(grid) {
  for (var i = 0; i < SUDOKU_DIMENSION_SIZE; i++) {
    var s = ""
    for (var j = 0; j < SUDOKU_DIMENSION_SIZE; j++) {
      s += grid[i][j] + " "
    }
    console.log(s)
  }
}

function sudoku_solution_to_grid(sol, gridVars) {
  var grid = []
  for (var i = 0; i < SUDOKU_DIMENSION_SIZE; i++) {
    grid.push([])
    for (var j = 0; j < SUDOKU_DIMENSION_SIZE; j++) {
      grid[i].push(sol.evaluate(gridVars[i][j]))
    }
  }
  return grid
}

function print_sudoku_solution(sol, gridVars) {
  print_grid(sudoku_solution_to_grid(sol, gridVars))
}

function islands_to_grid(islandsSet) {
  var grid = []

  for (var i = 0; i < SUDOKU_DIMENSION_SIZE; i++) {
    grid.push([]);
    for (var j = 0; j < SUDOKU_DIMENSION_SIZE; j++) {
      grid[i].push(0);
    }
  }

  islandsSet.forEach(function(island) {
    island.forEach(function(cell) {
      var row = Math.floor(cell / SUDOKU_DIMENSION_SIZE)
      var col = cell % SUDOKU_DIMENSION_SIZE
      grid[row][col] = 1;
    })
  })

  return grid
}

function print_islands(islandsSet) {
  print_grid(islands_to_grid(islandsSet))
}

function add_islands_constraints(solver, gridVars, islandsSet) {
  islandsSet.forEach(function(island) {
    island.forEach(function(cellA) {
      var rowA = Math.floor(cellA / SUDOKU_DIMENSION_SIZE)
      var colA = cellA % SUDOKU_DIMENSION_SIZE

      island.forEach(function(cellB) {
        if (cellA == cellB) return

        var rowB = Math.floor(cellB / SUDOKU_DIMENSION_SIZE)
        var colB = cellB % SUDOKU_DIMENSION_SIZE

        solver.forbid(LS.equalBits(gridVars[rowA][colA], gridVars[rowB][colB]));
      })
    })
  })
}

// values in grid:
// 0 = no arrow
// 1 = arrow up
// 2 = arrow right
// 3 = arrow down
// 4 = arrow left
function get_arrow_direction(row, col, numbersGrid, islandsGrid) {
  var cellKind = islandsGrid[row][col]
  var cellNumber = numbersGrid[row][col]

  // check upward
  var count = 0
  for (var i = row-1; i >= 0; i--) {
    if (islandsGrid[i][col] == cellKind) {
      count += 1
    }
  }
  if (count == cellNumber) {
    return 1
  }

  // check to right
  count = 0
  for (var i = col+1; i < SUDOKU_DIMENSION_SIZE; i++) {
    if (islandsGrid[row][i] == cellKind) {
      count += 1
    }
  }
  if (count == cellNumber) {
    return 2
  }

  // check downward
  var count = 0
  for (var i = row+1; i < SUDOKU_DIMENSION_SIZE; i++) {
    if (islandsGrid[i][col] == cellKind) {
      count += 1
    }
  }
  if (count == cellNumber) {
    return 3
  }

  // check to left
  count = 0
  for (var i = col-1; i >= 0; i--) {
    if (islandsGrid[row][i] == cellKind) {
      count += 1
    }
  }
  if (count == cellNumber) {
    return 4
  }

  return 0
}

function create_grid_with_arrows(numbersGrid, islandsGrid) {
  var arrowGrid = []
  for (var i = 0; i < SUDOKU_DIMENSION_SIZE; i++) {
    arrowGrid.push([])
    for (var j = 0; j < SUDOKU_DIMENSION_SIZE; j++) {
      arrowGrid[i].push( get_arrow_direction(i, j, numbersGrid, islandsGrid) )
    }
  }
  return arrowGrid
}

function count_non_zeros(arrowGrid) {
  var count = 0;
  for (var i = 0; i < SUDOKU_DIMENSION_SIZE; i++) {
    for (var j = 0; j < SUDOKU_DIMENSION_SIZE; j++) {
      if (arrowGrid[i][j] != 0) count += 1
    }
  }
  return count
}

function generate_martinka_sudoku(minArrows) {
  var solver = new LS.Solver();

  var gridVars = create_grid_variables();

  add_sudoku_constraints(solver, gridVars);
  //print_sudoku_solution(solver.solve(), gridVars);

  var islandsSet = generate_islands();
  //print_islands(islandsSet)

  add_islands_constraints(solver, gridVars, islandsSet);
  //print_sudoku_solution(solver.solve(), gridVars);

  var islandsGrid = islands_to_grid(islandsSet)
  var solution = solver.solve()
  if (solution == null) {
    console.log('out of solutions')
    return null
  }

  var numbersGrid = sudoku_solution_to_grid(solution, gridVars)
  var arrowGrid = create_grid_with_arrows(numbersGrid, islandsGrid)

  var arrowCount = count_non_zeros(arrowGrid)
  console.log('arrowCount', arrowCount)

/*
  console.log("islands:")
  print_grid(islandsGrid)
  console.log("numbers:")
  print_grid(numbersGrid)
  console.log("arrowGrid:")
  print_grid(arrowGrid)
*/

  return { martinka_sudoku: arrowGrid, solution: { numbers: numbersGrid, islands: islandsGrid } }
}

//generate_martinka_sudoku();

export function find_martinka_sudoku_min_arrows(minArrows) {
  var ms;
  do {
    ms = generate_martinka_sudoku(minArrows)
  } while (!ms || count_non_zeros(ms.martinka_sudoku) < minArrows)
  return ms;
}
