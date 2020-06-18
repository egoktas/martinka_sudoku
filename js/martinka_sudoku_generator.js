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

function getWaterCellsInSquares(waterCells) {
  var waterCellsInSquares = new Set();
  for (var i = 0; i < SUDOKU_DIMENSION_SIZE-1; i++) {
    for (var j = 0; j < SUDOKU_DIMENSION_SIZE-1; j++) {
      var leftTop = get_cell_number(i, j);
      if (!waterCells.has(leftTop)) {
        continue
      }

      var rightTop = get_cell_number(i, j+1);
      if (!waterCells.has(rightTop)) {
        continue
      }

      var leftBottom = get_cell_number(i+1, j);
      if (!waterCells.has(leftBottom)) {
        continue
      }

      var rightBottom = get_cell_number(i+1, j+1);
      if (!waterCells.has(rightBottom)) {
        continue
      }

      waterCellsInSquares.add(leftTop)
      waterCellsInSquares.add(rightTop)
      waterCellsInSquares.add(leftBottom)
      waterCellsInSquares.add(rightBottom)
    }
  }
  return waterCellsInSquares
}

function breaksFullLineOfWaterCells(landCells) {
  // check horizontally and vertically if we have 9 consecutive cells
  for (var i = 0; i < SUDOKU_DIMENSION_SIZE; i++) {
    var rowOfWaterCells = true
    var colOfWaterCells = true
    for (var j = 0; j < SUDOKU_DIMENSION_SIZE; j++) {
      var rowByRowCell = get_cell_number(i, j);
      if (landCells.has(rowByRowCell)) {
        rowOfWaterCells = false
      }

      var colByColCell = get_cell_number(j, i);
      if (landCells.has(colByColCell)) {
        colOfWaterCells = false
      }
    }
    if (rowOfWaterCells || colOfWaterCells) {
      return false
    }
  }
  return true
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
  var waterCellsInSquares = getWaterCellsInSquares(waterCells)
  while (waterCellsInSquares.size > 0) {
    var cell = getRandomItem(waterCellsInSquares)
    var row = Math.floor(cell/SUDOKU_DIMENSION_SIZE)
    var col = cell%SUDOKU_DIMENSION_SIZE

    expand_to_island(row, col, grid, landCells, waterCells, cellToIslandMapping);

    attempts += 1
    if (attempts % 100 == 0) console.log('attempts', attempts)

    if (attempts > 200 || breaksFullLineOfWaterCells(landCells)) {
      // restart
      landCells.forEach(function(cell) {
        waterCells.add(cell)
      })
      landCells.clear()
      cellToIslandMapping = {}
      attempts = 0
    }

    waterCellsInSquares = getWaterCellsInSquares(waterCells)
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
// 0x00 = no arrow
// 0x01 = arrow up
// 0x02 = arrow right up
// 0x04 = arrow right
// 0x08 = arrow right down
// 0x10 = arrow down
// 0x20 = arrow left down
// 0x40 = arrow left
// 0x80 = arrow left up
function get_arrow_direction(row, col, numbersGrid, islandsGrid) {
  var cellKind = islandsGrid[row][col]
  var cellNumber = numbersGrid[row][col]
  var res = 0

  // check upward
  var count = 0
  for (var i = row-1; i >= 0; i--) {
    if (islandsGrid[i][col] == cellKind) {
      count += 1
    }
  }
  if (count == cellNumber) {
    res |= 0x01
  }

  // check right up
  count = 0
  for (var i = row-1, j = col+1; i >= 0 && j < SUDOKU_DIMENSION_SIZE; i--, j++) {
    if (islandsGrid[i][j] == cellKind) {
      count += 1
    }
  }
  if (count == cellNumber) {
    res |= 0x02
  }

  // check to right
  count = 0
  for (var i = col+1; i < SUDOKU_DIMENSION_SIZE; i++) {
    if (islandsGrid[row][i] == cellKind) {
      count += 1
    }
  }
  if (count == cellNumber) {
    res |= 0x04
  }

  // check right down
  count = 0
  for (var i = row+1, j = col+1; i < SUDOKU_DIMENSION_SIZE && j < SUDOKU_DIMENSION_SIZE; i++, j++) {
    if (islandsGrid[i][j] == cellKind) {
      count += 1
    }
  }
  if (count == cellNumber) {
    res |= 0x08
  }

  // check downward
  var count = 0
  for (var i = row+1; i < SUDOKU_DIMENSION_SIZE; i++) {
    if (islandsGrid[i][col] == cellKind) {
      count += 1
    }
  }
  if (count == cellNumber) {
    res |= 0x10
  }

  // check left down
  count = 0
  for (var i = row+1, j = col-1; i < SUDOKU_DIMENSION_SIZE && j >= 0; i++, j--) {
    if (islandsGrid[i][j] == cellKind) {
      count += 1
    }
  }
  if (count == cellNumber) {
    res |= 0x20
  }

  // check to left
  count = 0
  for (var i = col-1; i >= 0; i--) {
    if (islandsGrid[row][i] == cellKind) {
      count += 1
    }
  }
  if (count == cellNumber) {
    res |= 0x40
  }

  // check left up
  count = 0
  for (var i = row-1, j = col-1; i >= 0 && j >= 0; i--, j--) {
    if (islandsGrid[i][j] == cellKind) {
      count += 1
    }
  }
  if (count == cellNumber) {
    res |= 0x80
  }

  return res
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

// TODO use this function also for arrow detection
function count_cell_kind_in_direction(row, col, direction, cellKind, islandsGrid) {
  var count = 0
  for (var i = row+direction.r, j = col+direction.c;
        i >= 0 && i < SUDOKU_DIMENSION_SIZE && j >= 0 && j < SUDOKU_DIMENSION_SIZE;
        i += direction.r, j += direction.c) {
    if (islandsGrid[i][j] == cellKind) {
      count += 1
    }
  }
  return count
}

function get_higher_digits_placements(gridVars, islandsSet, islandsGrid) {
  // set 5-8 digits, starting from 8

  var cellToIslandsMapping = {}
  islandsSet.forEach(function(island) {
    island.forEach(function(cell) {
      cellToIslandsMapping[cell] = island
    })
  })

  var digitLocations = {};
  for (var i = 1; i < SUDOKU_DIMENSION_SIZE; i++) {
    digitLocations[i] = new Set();
  }

  var directions = [
    {r:-1, c:0}, {r:-1, c:1}, {r:0, c:1}, {r:1, c:1},
    {r:1, c:0}, {r:1, c:-1}, {r:0, c:-1}, {r:-1, c:-1}
  ]

  var cellDigitCandidates = {};
  for (var i = 0; i < SUDOKU_DIMENSION_SIZE; i++) {
    for (var j = 0; j < SUDOKU_DIMENSION_SIZE; j++) {
      var cellNumber = get_cell_number(i,j)
      cellDigitCandidates[cellNumber] = new Set();

      var cellKind = islandsGrid[i][j]

      for (var d = 0; d < directions.length; d++) {
        var digitCandidate = count_cell_kind_in_direction(i, j, directions[d], cellKind, islandsGrid);
        if (digitCandidate == 0) continue
        //console.log(d, cellKind, i, j, digitCandidate)

        digitLocations[digitCandidate].add(cellNumber)
        cellDigitCandidates[cellNumber].add(digitCandidate)
      }
    }
  }

  var assumptionClause = null;
  var atDigit = 8;
  while (true) {
    //console.log(atDigit, digitLocations[atDigit])
    while (digitLocations[atDigit].size == 0 && atDigit > 0) {
      atDigit -= 1;
      //console.log(digitLocations[atDigit])
      //console.log(atDigit, digitLocations[atDigit])
    }
    //console.log(atDigit, digitLocations[atDigit])

    if (atDigit < 5) {
      // stop condition
      break;
    }
    // current digit has a possible placement

    // get candidate
    var pickedCell = getRandomItem(digitLocations[atDigit])
    //console.log("atDigit =", atDigit)
    //console.log("picked cell =", pickedCell)

    // remove candidate from digitLocations
    digitLocations[atDigit].delete(pickedCell)

    // place - add assumption to solver/gridVars !
    var row = Math.floor(pickedCell / SUDOKU_DIMENSION_SIZE)
    var col = pickedCell % SUDOKU_DIMENSION_SIZE
    if (assumptionClause) {
      assumptionClause = Logic.and(Logic.equalBits(gridVars[row][col], Logic.constantBits(atDigit)), assumptionClause)
    } else {
      assumptionClause = Logic.equalBits(gridVars[row][col], Logic.constantBits(atDigit))
    }

    // remove digit from row, col, block, island
    // for: go over cells in row
    for (var i = 0; i < SUDOKU_DIMENSION_SIZE; i++) {
      var rowCellNumber = get_cell_number(row, i)
      if (cellDigitCandidates.hasOwnProperty(rowCellNumber) && cellDigitCandidates[rowCellNumber].has(atDigit)) {
        cellDigitCandidates[rowCellNumber].delete(atDigit)
        digitLocations[atDigit].delete(rowCellNumber)
      }
    }

    // for: go over cells in col
    for (var i = 0; i < SUDOKU_DIMENSION_SIZE; i++) {
      var colCellNumber = get_cell_number(i, col)
      if (cellDigitCandidates.hasOwnProperty(colCellNumber) && cellDigitCandidates[colCellNumber].has(atDigit)) {
        cellDigitCandidates[colCellNumber].delete(atDigit)
        digitLocations[atDigit].delete(colCellNumber)
      }
    }

    // for: go over cells in block
    var blockRowBase = row - (row % 2)
    var blockColBase = col - (col % 2)
    for (var i = 0; i < SUDOKU_DIMENSION_SIZE/3; i++) {
      for (var j = 0; j < SUDOKU_DIMENSION_SIZE/3; j++) {
        var blockCellNumber = get_cell_number(blockRowBase + i, blockColBase + j)
        if (cellDigitCandidates.hasOwnProperty(blockCellNumber) && cellDigitCandidates[blockCellNumber].has(atDigit)) {
          cellDigitCandidates[blockCellNumber].delete(atDigit)
          digitLocations[atDigit].delete(blockCellNumber)
        }
      }
    }

    // for: go over cells in island, only if cell is land
    if (cellToIslandsMapping.hasOwnProperty(pickedCell)) {
      // picked cell is land
      cellToIslandsMapping[pickedCell].forEach(function(islandCell) {
        if (cellDigitCandidates.hasOwnProperty(islandCell) && cellDigitCandidates[islandCell].has(atDigit)) {
          cellDigitCandidates[islandCell].delete(atDigit)
          digitLocations[atDigit].delete(islandCell)
        }
      })
    }
  }
  return assumptionClause
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
  var higherDigitsPlacements = get_higher_digits_placements(gridVars, islandsSet, islandsGrid);

  //var solver_solution = solver.solve()
  var solver_solution = solver.solveAssuming(higherDigitsPlacements)
  if (solver_solution == null) {
    console.log('out of solutions')
    return null
  }

  var numbersGrid = sudoku_solution_to_grid(solver_solution, gridVars)
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
