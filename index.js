/* global preloadImagesTmr fxhash fxrand $fx fxpreview paper1Loaded noise */

//
//  fxhash - are friends electric?
//
//
//  HELLO!! Code is copyright revdancatt (that's me), so no sneaky using it for your
//  NFT projects.
//  But please feel free to unpick it, and ask me questions. A quick note, this is written
//  as an artist, which is a slightly different (and more storytelling way) of writing
//  code, than if this was an engineering project. I've tried to keep it somewhat readable
//  rather than doing clever shortcuts, that are cool, but harder for people to understand.
//
//  You can find me at...
//  https://twitter.com/revdancatt
//  https://instagram.com/revdancatt
//  https://youtube.com/revdancatt
//

// Global values, because today I'm being an artist not an engineer!
const ratio = 1 // canvas ratio
const features = {} //  so we can keep track of what we're doing
let nextFrame = null // requestAnimationFrame, and the ability to clear it
let resizeTmr = null // a timer to make sure we don't resize too often
let highRes = false // display high or low res
let drawStarted = false // Flag if we have kicked off the draw loop
let thumbnailTaken = false
let forceDownloaded = false
const urlSearchParams = new URLSearchParams(window.location.search)
const urlParams = Object.fromEntries(urlSearchParams.entries())
const prefix = 'are-friends-electric'
// dumpOutputs will be set to false unless we have ?dumpOutputs=true in the URL
const dumpOutputs = urlParams.dumpOutputs === 'true'
const startTime = new Date().getTime()

// Custom features go here
let lastAction = new Date().getTime()
const NORTH = 0
const EAST = 1
const SOUTH = 2
const WEST = 3

window.$fxhashFeatures = {
  Release: 'mnml Ser I',
  Day: 'Five'
}

//  Work out what all our features are
const makeFeatures = () => {
  // features.background = 1
  features.paperOffset = {
    paper1: {
      x: fxrand(),
      y: fxrand()
    },
    paper2: {
      x: fxrand(),
      y: fxrand()
    }
  }

  features.debug = false

  const minGrid = 16
  const maxGrid = 28
  const gridDiff = maxGrid - minGrid
  const gridMod = Math.floor(fxrand() * gridDiff)
  features.gridSize = minGrid + gridMod
  const gridPercent = gridMod / gridDiff

  features.grid = {}
  features.startPosition = {
    x: Math.min(Math.max(1, Math.floor((fxrand() * features.gridSize / 2) + (fxrand() * features.gridSize / 2))), features.gridSize - 2),
    y: 0,
    facing: NORTH,
    continuous: 0
  }
  features.line = []
  features.line.push(features.startPosition)

  const minLengthMod = 16
  const maxLengthMod = 22

  // features.gridSize = 16

  features.maxLength = features.gridSize * (minLengthMod + Math.floor(gridPercent * (maxLengthMod - minLengthMod)))

  // features.maxLength = features.gridSize * 16

  //  Fill the grid
  for (let y = 0; y < features.gridSize; y++) {
    for (let x = 0; x < features.gridSize; x++) {
      const index = `${x},${y}`
      features.grid[index] = {
        westWall: false,
        southWall: false,
        inside: false
      }
    }
  }

  //  Now we do the walk
  //  We're going to keep doing it until we haven't failed, this
  //  is so we can be a bit sketchy about testing edge cases, we
  //  just keep going over and over again until we hit on something that works.
  features.boxes = []
  let nudgeCounter = 0
  while (features.boxes.length < 4) {
    let failed = false
    let ended = false
    let exitCount = 0
    let totalLength = 0

    while (failed === false && ended === false && exitCount < 4000) {
      //  we haven't failed yet!
      failed = false
      //  Grab the current position
      const currentPoint = features.line[features.line.length - 1]

      //  Record the walls used into the grid
      try {
        if (currentPoint.facing === NORTH && currentPoint.y <= features.gridSize) features.grid[`${currentPoint.x},${currentPoint.y}`].westWall = true
        if (currentPoint.facing === EAST && currentPoint.x <= features.gridSize) features.grid[`${currentPoint.x},${currentPoint.y}`].southWall = true
        if (currentPoint.facing === SOUTH && currentPoint.y - 1 >= 0) features.grid[`${currentPoint.x},${currentPoint.y - 1}`].westWall = true
        if (currentPoint.facing === WEST && currentPoint.x - 1 >= 0) features.grid[`${currentPoint.x - 1},${currentPoint.y}`].southWall = true
      } catch (er) {}

      //  Set the new point to the current postion
      const newPoint = {
        x: currentPoint.x,
        y: currentPoint.y,
        facing: currentPoint.facing,
        continuous: currentPoint.continuous + 1
      }
      //  Move us
      if (currentPoint.facing === NORTH) newPoint.y += 1
      if (currentPoint.facing === EAST) newPoint.x += 1
      if (currentPoint.facing === SOUTH) newPoint.y -= 1
      if (currentPoint.facing === WEST) newPoint.x -= 1

      //  Work out which way we should turn
      let chanceToTurn = 0
      //  Add a 10% chance to turn for the length of the line
      chanceToTurn += newPoint.continuous * 10
      //  Increase the chance to turn as we get closer to the edge
      //  TODO:
      //  Set the chance to 100% if we have hit the edge
      if (newPoint.facing === NORTH && newPoint.y === features.gridSize - 1) chanceToTurn = 100
      if (newPoint.facing === EAST && newPoint.x === features.gridSize - 1) chanceToTurn = 100
      if (newPoint.facing === SOUTH && newPoint.y === 1) chanceToTurn = 100
      if (newPoint.facing === WEST && newPoint.x === 0) chanceToTurn = 100

      //  Increase the chance to turn if we are approaching already filled in walls
      try {
        if (newPoint.facing === NORTH && newPoint.y < features.gridSize && features.grid[`${newPoint.x},${newPoint.y + 1}`].westWall) chanceToTurn = 100
        if (newPoint.facing === EAST && newPoint.x < features.gridSize && features.grid[`${newPoint.x + 1},${newPoint.y}`].southWall) chanceToTurn = 100
        if (newPoint.facing === SOUTH && newPoint.y > 2 && features.grid[`${newPoint.x},${newPoint.y - 2}`].westWall) chanceToTurn = 100
        if (newPoint.facing === WEST && newPoint.x > 2 && features.grid[`${newPoint.x - 2},${newPoint.y}`].southWall) chanceToTurn = 100
      } catch (er) {}

      newPoint.chanceToTurn = chanceToTurn

      //  Now roll the dice to see if we turn
      if (fxrand() <= chanceToTurn / 100) {
        //  Now go through what where when and how we may turn, there's all sorts
        //  of super cool algorithms we could use to do this, but we're going to
        //  do it the old Choose Your Own Adventure way. If we need to we can wrap
        //  up a couple of checks in a function, but probably not
        //  Facing north first
        let canTurnNorth = 0
        let canTurnEast = 0
        let canTurnSouth = 0
        let canTurnWest = 0

        if (currentPoint.facing === NORTH) {
          canTurnEast = 1
          canTurnWest = 1
          //  Check to see if we can actually turn east or west
          try {
            if (newPoint.x - 2 >= 0 && features.grid[`${newPoint.x - 2},${newPoint.y}`].southWall) canTurnWest = 0
            if (newPoint.x - 1 >= 0 && features.grid[`${newPoint.x - 1},${newPoint.y}`].southWall) canTurnWest = 0
            if (newPoint.x + 1 < features.gridSize && features.grid[`${newPoint.x + 1},${newPoint.y}`].southWall) canTurnEast = 0
            if (newPoint.x < features.gridSize && features.grid[`${newPoint.x},${newPoint.y}`].southWall) canTurnEast = 0
          } catch (er) {}
        }

        if (currentPoint.facing === EAST) {
          canTurnNorth = 1
          canTurnSouth = 1
          //  Check to see if we can actually turn north or south
          try {
            if (newPoint.y - 2 >= 0 && features.grid[`${newPoint.x},${newPoint.y - 2}`].westWall) canTurnSouth = 0
            if (newPoint.y - 1 >= 0 && features.grid[`${newPoint.x},${newPoint.y - 1}`].westWall) canTurnSouth = 0
            if (newPoint.y + 1 < features.gridSize && features.grid[`${newPoint.x},${newPoint.y + 1}`].westWall) canTurnNorth = 0
            if (newPoint.y < features.gridSize && features.grid[`${newPoint.x},${newPoint.y}`].westWall) canTurnNorth = 0
          } catch (er) {}
        }

        if (currentPoint.facing === SOUTH) {
          canTurnEast = 1
          canTurnWest = 1
          //  Check to see if we can actually turn east or west
          try {
            if (newPoint.x - 2 >= 0 && features.grid[`${newPoint.x - 2},${newPoint.y}`].southWall) canTurnWest = 0
            if (newPoint.x - 1 >= 0 && features.grid[`${newPoint.x - 1},${newPoint.y}`].southWall) canTurnWest = 0
            if (newPoint.x + 1 < features.gridSize && features.grid[`${newPoint.x + 1},${newPoint.y}`].southWall) canTurnEast = 0
            if (newPoint.x < features.gridSize && features.grid[`${newPoint.x},${newPoint.y}`].southWall) canTurnEast = 0
          } catch (er) {}
        }

        if (currentPoint.facing === WEST) {
          canTurnNorth = 1
          canTurnSouth = 1
          //  Check to see if we can actually turn north or south
          try {
            if (newPoint.y - 2 >= 0 && features.grid[`${newPoint.x},${newPoint.y - 2}`].westWall) canTurnSouth = 0
            if (newPoint.y - 1 >= 0 && features.grid[`${newPoint.x},${newPoint.y - 1}`].westWall) canTurnSouth = 0
            if (newPoint.y + 1 < features.gridSize && features.grid[`${newPoint.x},${newPoint.y + 1}`].westWall) canTurnNorth = 0
            if (newPoint.y < features.gridSize && features.grid[`${newPoint.x},${newPoint.y}`].westWall) canTurnNorth = 0
          } catch (er) {}
        }

        //  But, we can't crash into a wall
        if (currentPoint.facing === NORTH && currentPoint.x <= 0) canTurnWest = 0
        if (currentPoint.facing === NORTH && currentPoint.x >= features.gridSize - 1) canTurnEast = 0
        if (currentPoint.facing === EAST && currentPoint.y <= 1) canTurnSouth = 0
        if (currentPoint.facing === EAST && currentPoint.y >= features.gridSize - 1) canTurnNorth = 0
        if (currentPoint.facing === SOUTH && currentPoint.x <= 0) canTurnWest = 0
        if (currentPoint.facing === SOUTH && currentPoint.x >= features.gridSize - 1) canTurnEast = 0
        if (currentPoint.facing === WEST && currentPoint.y <= 1) canTurnSouth = 0
        if (currentPoint.facing === WEST && currentPoint.y >= features.gridSize - 1) canTurnNorth = 0

        //  Now we know what our options are, we need to pick one.
        //  We can control the _chance_ of picking one over the other
        //  by the number of times we put it into the array
        const turnOptions = []
        for (let i = 0; i < canTurnNorth; i++) turnOptions.push(NORTH)
        for (let i = 0; i < canTurnEast; i++) turnOptions.push(EAST)
        for (let i = 0; i < canTurnSouth; i++) turnOptions.push(SOUTH)
        for (let i = 0; i < canTurnWest; i++) turnOptions.push(WEST)
        newPoint.turnOptions = turnOptions

        //  Now pick the new direction
        if (turnOptions.length === 0) {
          //  If we can't turn, check to see if we are going to run into anything, if so then we
          //  need to mark outselves as ended
          if (newPoint.facing === NORTH) {
            //  If we are at the very top, and can't turn, then we are ended
            if (newPoint.y === features.gridSize - 1) {
              ended = true
            } else {
              //  If we can't turn east or west, or carry on, then we are done for, end here
              if (features.grid[`${newPoint.x},${newPoint.y + 1}`].westWall) ended = true
            }
          }

          if (newPoint.facing === EAST) {
            //  If we are at the very top, and can't turn, then we are ended
            if (newPoint.x === features.gridSize - 1) {
              ended = true
            } else {
              //  If we can't turn north or south, or carry on, then we are done for, end here
              if (features.grid[`${newPoint.x + 1},${newPoint.y}`].southWall) ended = true
            }
          }

          if (newPoint.facing === SOUTH) {
            //  If we are at the very top, and can't turn, then we are ended
            if (newPoint.y < 2) {
              ended = true
            } else {
              //  If we can't turn east or west, or carry on, then we are done for, end here
              if (features.grid[`${newPoint.x},${newPoint.y - 2}`].westWall) ended = true
            }
          }

          if (newPoint.facing === WEST) {
            //  If we are at the very top, and can't turn, then we are ended
            if (newPoint.x < 2) {
              ended = true
            } else {
              //  If we can't turn north or south, or carry on, then we are done for, end here
              if (features.grid[`${newPoint.x - 2},${newPoint.y}`].southWall) ended = true
            }
          }
        } else {
          newPoint.facing = turnOptions[Math.floor(fxrand() * turnOptions.length)]
        }
      }

      //  If we're now facing a new direction then reset the continuous counter
      if (newPoint.facing !== currentPoint.facing) {
        newPoint.continuous = 0
      }

      //  Add the new point to the lines
      if (!ended) features.line.push(newPoint)

      //  Check to see if we have ended by facing the edge
      if (newPoint.x <= 0 && newPoint.facing === WEST) ended = true
      if (newPoint.x >= features.gridSize - 1 && newPoint.facing === EAST) ended = true
      if (newPoint.y <= 1 && newPoint.facing === SOUTH) ended = true // Special case, don't want to go back down to the start line
      if (newPoint.y >= features.gridSize - 1 && newPoint.facing === NORTH) ended = true

      //  If the length exceeds a ratio of the total grid size then we end
      totalLength = 0
      for (const line of features.line) {
        totalLength += line.continuous
      }
      if (totalLength >= features.maxLength) ended = true

      //  If the length is less than the maxLength but we have ended
      //  that must mean we have failed
      if (ended && totalLength < features.maxLength) {
        failed = true
      }

      //  We need to check if the last point has already been used
      if (ended && !failed) {
        let clash = true
        while (clash) {
          const lastPoint = features.line[features.line.length - 1]
          clash = false
          for (let p = 0; p < features.line.length - 2; p++) {
            const testPoint = features.line[p]
            if (lastPoint.x === testPoint.x && lastPoint.y === testPoint.y) {
              clash = true
              features.line.pop()
              break
            }
          }
        }

        //  Rebuild the grid
        for (let y = 0; y < features.gridSize; y++) {
          for (let x = 0; x < features.gridSize; x++) {
            const index = `${x},${y}`
            features.grid[index] = {
              westWall: false,
              southWall: false,
              inside: false
            }
          }
        }
        for (let p = 0; p < features.line.length - 1; p++) {
          const testPoint = features.line[p]
          if (testPoint.facing === NORTH) features.grid[`${testPoint.x},${testPoint.y}`].westWall = true
          if (testPoint.facing === EAST) features.grid[`${testPoint.x},${testPoint.y}`].southWall = true
          if (testPoint.facing === SOUTH) features.grid[`${testPoint.x},${testPoint.y - 1}`].westWall = true
          if (testPoint.facing === WEST) features.grid[`${testPoint.x - 1},${testPoint.y}`].southWall = true
        }
      }

      //  See if we have any closed boxes
      features.finishedLines = []
      const previousSegment = {
        start: {
          x: features.line[0].x,
          y: features.line[0].y
        },
        facing: features.line[0].facing,
        length: 1
      }
      for (let p = 1; p < features.line.length - 1; p++) {
        const thisSegment = features.line[p]
        //  If we have turned a corner then, wrap up the previous segment, store it
        //  and start a new one
        if (thisSegment.continuous === 0) {
          previousSegment.end = {
            x: thisSegment.x,
            y: thisSegment.y
          }
          features.finishedLines.push(JSON.parse(JSON.stringify(previousSegment)))
          //  make a new previous segment
          previousSegment.start = {
            x: thisSegment.x,
            y: thisSegment.y
          }
          previousSegment.facing = thisSegment.facing
          previousSegment.length = 1
        } else {
          previousSegment.length++
        }
      }
      //  Now add the final line
      previousSegment.end = {
        x: features.line[features.line.length - 1].x,
        y: features.line[features.line.length - 1].y,
        length: features.line[features.line.length - 1].continuous
      }
      features.finishedLines.push(previousSegment)

      //  This allows us to exit if things never work
      if (failed) {
        exitCount++
        //  Reset and try again
        features.startPosition = {
          x: Math.min(Math.max(1, Math.floor((fxrand() * features.gridSize / 2) + (fxrand() * features.gridSize / 2))), features.gridSize - 2),
          y: 0,
          facing: NORTH,
          continuous: 0
        }
        features.line = []
        features.line.push(features.startPosition)

        //  Empty the grid
        for (let y = 0; y < features.gridSize; y++) {
          for (let x = 0; x < features.gridSize; x++) {
            const index = `${x},${y}`
            features.grid[index] = {
              westWall: false,
              southWall: false,
              inside: false
            }
          }
        }

        ended = false
        failed = false
      }
    }

    for (let l = 0; l < features.finishedLines.length - 3; l++) {
      const line1 = features.finishedLines[l]
      const line2 = features.finishedLines[l + 1]
      const line3 = features.finishedLines[l + 2]
      const line4 = features.finishedLines[l + 3]
      const facingCheck = []
      facingCheck.push(line1.facing)
      facingCheck.push(line2.facing)
      facingCheck.push(line3.facing)
      facingCheck.push(line4.facing)
      if (facingCheck.includes(NORTH) && facingCheck.includes(EAST) && facingCheck.includes(SOUTH) && facingCheck.includes(WEST)) {
        if (line1.length > line3.length && line4.length > line2.length) {
          const newBox = {}
          if (line1.facing === NORTH || line1.facing === SOUTH) {
            //  Do the left right sides
            newBox.left = Math.min(line1.start.x, line3.start.x)
            newBox.right = Math.max(line1.start.x, line3.start.x)
            //  Do the top bottom sides
            newBox.top = Math.max(line2.start.y, line4.start.y)
            newBox.bottom = Math.min(line2.start.y, line4.start.y)
          } else {
            //  Do the left right sides
            newBox.left = Math.min(line2.start.x, line4.start.x)
            newBox.right = Math.max(line2.start.x, line4.start.x)
            //  Do the top bottom sides
            newBox.top = Math.max(line1.start.y, line3.start.y)
            newBox.bottom = Math.min(line1.start.y, line3.start.y)
          }
          newBox.width = newBox.right - newBox.left
          newBox.height = newBox.top - newBox.bottom
          newBox.area = newBox.width * newBox.height
          const angles = [0, 30, 45, 60, 90]
          const boxColours = ['magenta', 'cyan', 'yellow']
          newBox.angle = angles[Math.floor(fxrand() * angles.length)]
          newBox.colour = boxColours[Math.floor(fxrand() * boxColours.length)]
          newBox.style = 'box'
          features.boxes.push(newBox)
        }
      }
    }

    nudgeCounter++
    if (nudgeCounter > 8000) {
      // Stop the whole thing
      break
    }
    console.log('exitCount: ', exitCount)
  }

  //  Now that we have the lines we need to break them down into smaller amounts
  features.decimatedLine = []
  for (let p = 0; p < features.line.length - 1; p++) {
    const from = {
      x: features.line[p].x,
      y: features.line[p].y
    }
    const to = {
      x: features.line[p + 1].x,
      y: features.line[p + 1].y
    }
    const steps = 10
    for (let s = 0; s < steps; s++) {
      const diff = {
        x: to.x - from.x,
        y: to.y - from.y
      }
      const point = {
        x: from.x + (diff.x * s / steps),
        y: from.y + (diff.y * s / steps)
      }
      features.decimatedLine.push(point)
    }
  }
  features.decimatedLine.push({
    x: features.line[features.line.length - 1].x,
    y: features.line[features.line.length - 1].y
  })

  features.wonkyLineColours = ['magenta', 'cyan', 'yellow']
  const offsets = [{
    xShift: 1000,
    yShift: 900,
    xMod: 1.5,
    yMod: 1.5
  }, {
    xShift: 1333,
    yShift: -912,
    xMod: 2,
    yMod: 2
  }, {
    xShift: -2323,
    yShift: 1111,
    xMod: 2.5,
    yMod: 2.5
  }]
  features.wonkyLines = []
  features.wonkyness = Math.ceil(fxrand() * 4)
  features.wonkyLineColours.forEach(() => {
    const noiseOffset = offsets.pop()
    const newLine = []
    for (const point of features.decimatedLine) {
      const offset = {
        x: noise.perlin2((point.x + noiseOffset.xShift) / noiseOffset.xMod, (point.y + noiseOffset.xShift) / noiseOffset.xMod) / (15 - (features.wonkyness * 2)),
        y: noise.perlin2((point.x + noiseOffset.yShift) / noiseOffset.yMod, (point.y + noiseOffset.yShift) / noiseOffset.yMod) / (15 - (features.wonkyness * 2))
      }
      const newPoint = {
        x: point.x + offset.x,
        y: point.y + offset.y
      }
      newLine.push(newPoint)
    }
    features.wonkyLines.push(newLine)
  })

  //  Now find the empty spaces
  let spaceNeeded = 5
  features.dotted = []
  const dotLimit = 3
  while (spaceNeeded > 0) {
    for (let y = 0; y < features.gridSize; y++) {
      if (y <= spaceNeeded + 2 || features.gridSize - y < (spaceNeeded + 3)) continue
      for (let x = 0; x < features.gridSize; x++) {
        if (x <= spaceNeeded + 1 || features.gridSize - x < (spaceNeeded + 3)) continue
        let allClear = true
        for (let scanY = y - spaceNeeded; scanY < y + spaceNeeded + 2; scanY++) {
          for (let scanX = x - spaceNeeded; scanX < x + spaceNeeded + 2; scanX++) {
            const index = `${scanX},${scanY}`
            //  If we are on not on the right hand side, then also check the southWall
            if (scanX < x + spaceNeeded + 1 && features.grid[index].southWall) allClear = false
            if (scanY < y + spaceNeeded + 1 && features.grid[index].westWall) allClear = false
          }
        }
        const dotAngles = [0, 30, 45, 60, 90]
        const dotColours = ['magenta', 'cyan', 'yellow']
        if (allClear && !features.grid[`${x},${y}`].dotted) {
          features.grid[`${x},${y}`].dotted = true
          features.dotted.push({
            x,
            y,
            angle: dotAngles[Math.floor(fxrand() * dotAngles.length)],
            colour: dotColours[Math.floor(fxrand() * dotColours.length)],
            spaceNeeded: Math.floor(spaceNeeded)
          })
        }
      }
    }
    spaceNeeded--
  }

  features.dotted = features.dotted.map(value => ({
    value,
    sort: fxrand()
  }))
    .sort((a, b) => a.sort - b.sort)
    .map(({
      value
    }) => value).slice(0, Math.min(dotLimit, features.dotted.length))

  features.spaceNeeded = spaceNeeded

  //  Now we make the bugs
  features.bugs = []
  features.maxBugs = 5 + (Math.floor(fxrand() * 10))
  for (let b = 0; b < features.maxBugs; b++) {
    const newBug = {
      position: fxrand(),
      speed: 1 + (fxrand() - 0.5),
      direction: 1 - Math.floor(fxrand() * 2) * 2,
      type: ['square', 'round'][Math.floor(fxrand() * 2)],
      size: fxrand()
    }
    features.bugs.push(newBug)
  }

  window.$fxhashFeatures.Grid = features.gridSize
  window.$fxhashFeatures.Boxes = features.boxes.length
  window.$fxhashFeatures.Bugs = features.bugs.length
  window.$fxhashFeatures.Dots = features.dotted.length
  window.$fxhashFeatures.Lines = features.finishedLines.length
  window.$fxhashFeatures.Length = features.line.length
  window.$fxhashFeatures.Wonky = ['Chill', 'Vibes', 'Feeling it', 'Belting'][features.wonkyness - 1]
}

//  Call the above make features, so we'll have the window.$fxhashFeatures available
//  for fxhash
makeFeatures()
console.table(window.$fxhashFeatures)

const drawCanvas = async () => {
  drawStarted = true
  //  Make sure there's only one nextFrame to be called
  window.cancelAnimationFrame(nextFrame)

  // Grab all the canvas stuff
  const canvas = document.getElementById('target')
  const ctx = canvas.getContext('2d')
  const w = canvas.width
  const h = canvas.height

  //  Lay down the first paper texture
  ctx.fillStyle = features.paper1Pattern
  ctx.save()
  ctx.translate(-w * features.paperOffset.paper1.x, -h * features.paperOffset.paper1.y)
  ctx.fillRect(0, 0, w * 2, h * 2)
  ctx.restore()

  //  Lay down the second paper texture
  ctx.globalCompositeOperation = 'darken'
  ctx.fillStyle = features.paper2Pattern
  ctx.save()
  ctx.translate(-w * features.paperOffset.paper1.x, -h * features.paperOffset.paper1.y)
  ctx.fillRect(0, 0, w * 2, h * 2)
  ctx.restore()
  ctx.globalCompositeOperation = 'source-over'

  //  If we want to modify the colour, i.e. for riso pink, do that here
  if (features.background) {
    ctx.globalCompositeOperation = 'screen'
    ctx.fillStyle = `hsla(${features.background}, 100%, 50%, 1)`
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'source-over'
  }

  //  Now we are going to draw the line
  //  work out the cellSize, by also adding a border onto the left and right
  const cellSize = w / (features.gridSize + 1)
  const borderOffset = {
    x: cellSize,
    y: 0
  }
  ctx.strokeStyle = 'black'

  if (features.debug) {
    //  Draw the grid for debugging
    ctx.lineWidth = 2
    for (let y = 0; y < features.gridSize; y++) {
      ctx.beginPath()
      ctx.moveTo(cellSize, h - (y * cellSize))
      ctx.lineTo(w - cellSize, h - (y * cellSize))
      ctx.stroke()
    }
    for (let x = 0; x < features.gridSize; x++) {
      ctx.beginPath()
      ctx.moveTo(x * cellSize + cellSize, 2 * cellSize)
      ctx.lineTo(x * cellSize + cellSize, h)
      ctx.stroke()
    }
  }

  //  Draw the line
  let lineIndex = 0
  ctx.globalCompositeOperation = 'multiply'
  for (const colour of features.wonkyLineColours) {
    const thisLine = features.wonkyLines[lineIndex]
    ctx.lineWidth = w / features.gridSize / 5
    ctx.strokeStyle = colour
    ctx.beginPath()
    ctx.moveTo(thisLine[0].x * cellSize + borderOffset.x, h - (thisLine[0].y * cellSize + borderOffset.y))
    for (let p = 1; p < thisLine.length; p++) {
      const point = thisLine[p]
      ctx.lineTo(point.x * cellSize + borderOffset.x, h - (point.y * cellSize + borderOffset.y))
    }
    ctx.stroke()
    lineIndex++
  }
  //  Draw a circle at the end
  lineIndex = 0
  for (const colour of features.wonkyLineColours) {
    const lastPoint = features.wonkyLines[lineIndex][features.wonkyLines[lineIndex].length - 1]
    ctx.fillStyle = colour
    ctx.beginPath()
    ctx.arc(lastPoint.x * cellSize + borderOffset.x, h - (lastPoint.y * cellSize + borderOffset.y), w / features.gridSize / 3, 0, 2 * Math.PI)
    ctx.fill()
    lineIndex++
  }
  ctx.globalCompositeOperation = 'source-over'

  //  Fill in the boxes
  for (const box of features.boxes) {
    const tinyOffset = {
      x: w / 75,
      y: -h / 100
    }

    const left = box.left * cellSize + borderOffset.x + tinyOffset.x
    const right = box.left * cellSize + borderOffset.x + (box.width * cellSize) + tinyOffset.x
    const top = h - (box.top * cellSize + borderOffset.y) + tinyOffset.y
    const bottom = h - (box.top * cellSize + borderOffset.y - (box.height * cellSize)) + tinyOffset.y
    const width = right - left
    const height = bottom - top

    if (box.style === 'box') {
      ctx.fillStyle = box.colour
      ctx.globalCompositeOperation = 'multiply'
      ctx.globalAlpha = 0.7
      ctx.fillRect(left + tinyOffset.x / 4, top - tinyOffset.y / 3, width, height)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1.0
    }

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(left, top)
    ctx.lineTo(right, top)
    ctx.lineTo(right, bottom)
    ctx.lineTo(left, bottom)
    ctx.lineTo(left, top)
    ctx.clip()

    ctx.save()
    ctx.translate((left + (width / 2)), (top + (height / 2)))
    ctx.rotate(box.angle * Math.PI / 180)
    const outsideSize = Math.max(width, height)
    ctx.lineWidth = w / 800
    ctx.strokeStyle = 'black'
    let y = -outsideSize
    while (y <= outsideSize * 2) {
      ctx.beginPath()
      let x = -outsideSize
      ctx.moveTo(x, y)
      while (x <= outsideSize * 2) {
        ctx.lineTo(x + (noise.perlin2(x / 10, y / 10) * w / 2000), y + (noise.perlin2(x / 10, y / 10) * w / 2000))
        x += ctx.lineWidth * 2
      }
      ctx.stroke()
      y += ctx.lineWidth * 4
    }
    ctx.restore()
    ctx.restore()
  }

  //  Do the dots
  for (const dotBox of features.dotted) {
    const tinyOffset = {
      x: w / 75,
      y: -h / 100
    }
    tinyOffset.x += (noise.perlin2(dotBox.x / 12, dotBox.y / 9) * w / 3)
    tinyOffset.y += (noise.perlin2(dotBox.x / 8, dotBox.y / 11) * w / 4)

    const left = (dotBox.x - dotBox.spaceNeeded) * cellSize + borderOffset.x + tinyOffset.x
    const right = (dotBox.x + dotBox.spaceNeeded + 1) * cellSize + borderOffset.x + tinyOffset.x
    const top = h - ((dotBox.y + dotBox.spaceNeeded + 1) * cellSize + borderOffset.y) + tinyOffset.y
    const bottom = h - ((dotBox.y - dotBox.spaceNeeded) * cellSize + borderOffset.y) + tinyOffset.y
    const width = right - left
    const height = bottom - top

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(left, top)
    ctx.lineTo(right, top)
    ctx.lineTo(right, bottom)
    ctx.lineTo(left, bottom)
    ctx.lineTo(left, top)
    ctx.clip()

    ctx.save()
    ctx.translate((left + (width / 2)), (top + (height / 2)))
    ctx.rotate(dotBox.angle * Math.PI / 180)
    const outsideSize = Math.max(width, height)
    const radius = w / 400
    let y = -outsideSize
    while (y <= outsideSize * 2) {
      let x = -outsideSize
      while (x <= outsideSize * 2) {
        ctx.fillStyle = dotBox.colour
        ctx.beginPath()
        ctx.arc(x + (noise.perlin2(x / 10, y / 10) * w / 1000), y + (noise.perlin2(x / 10, y / 10) * w / 1000), radius, 0, 2 * Math.PI)
        ctx.fill()
        ctx.fillStyle = 'black'
        ctx.beginPath()
        ctx.arc(x + (noise.perlin2(x / 10, y / 10) * w / 1000) - w / 800, y + (noise.perlin2(x / 10, y / 10) * w / 800) - h / 2000, radius, 0, 2 * Math.PI)
        ctx.fill()
        x += radius * 4
      }
      ctx.stroke()
      y += radius * 4
    }
    ctx.restore()
    ctx.restore()
  }
  if (features.debug) {
    //  Draw the walls
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'
    for (const c in features.grid) {
      const x = parseInt(c.split(',')[0])
      const y = parseInt(c.split(',')[1])
      const cell = features.grid[c]
      if (cell.westWall) {
        ctx.beginPath()
        ctx.moveTo(x * cellSize + borderOffset.x, h - (y * cellSize + borderOffset.y))
        ctx.lineTo(x * cellSize + borderOffset.x, h - (y * cellSize + cellSize + borderOffset.y))
        ctx.stroke()
      }
      if (cell.southWall) {
        ctx.beginPath()
        ctx.moveTo(x * cellSize + borderOffset.x, h - (y * cellSize + borderOffset.y))
        ctx.lineTo(x * cellSize + cellSize + borderOffset.x, h - (y * cellSize + borderOffset.y))
        ctx.stroke()
      }
    }

    //  Draw the boxes
    ctx.fillStyle = 'rgba(0, 0, 255, 0.2)'
    for (const box of features.boxes) {
      ctx.fillRect(box.left * cellSize + borderOffset.x, h - (box.top * cellSize + borderOffset.y), box.width * cellSize, box.height * cellSize)
    }
  }

  //  Move the bugs
  //  Find out how many ms have passed since the last
  //  time we did something
  const bugTime = new Date().getTime()
  const bugDiff = bugTime - lastAction
  lastAction = bugTime
  ctx.globalCompositeOperation = 'multiply'
  //  Work out the length of a line secment as an overall percent
  const linePercent = 1 / features.wonkyLines[0].length
  const minCircleSize = w / features.gridSize / 6
  const maxCircleSize = w / features.gridSize / 3
  for (const bug of features.bugs) {
    //  Work out how far we should have moved along
    //  the line
    const bugMoveDistance = bugDiff / 1000 * bug.speed * 1.666 * linePercent
    bug.position += (bugMoveDistance * bug.direction)
    while (bug.position >= 1) bug.position -= 1
    while (bug.position < 0) bug.position += 1
    //  Work out the start line
    const startLine = Math.floor(features.wonkyLines[0].length * bug.position)
    const endLine = startLine + 1
    const betweenLinesPercent = features.wonkyLines[0].length * bug.position - startLine
    //  Now draw them three times each
    const bugColour = ['magenta', 'cyan', 'yellow']
    //  Doing it for each colour
    for (const i in bugColour) {
      ctx.fillStyle = bugColour[i]
      try {
        const startPos = {
          x: features.wonkyLines[i][startLine].x,
          y: features.wonkyLines[i][startLine].y
        }
        const endPos = {
          x: features.wonkyLines[i][endLine].x,
          y: features.wonkyLines[i][endLine].y
        }
        const bugPos = {
          x: startPos.x + ((endPos.x - startPos.x) * betweenLinesPercent),
          y: startPos.y + ((endPos.y - startPos.y) * betweenLinesPercent)
        }

        ctx.beginPath()
        ctx.arc(bugPos.x * cellSize + borderOffset.x, h - (bugPos.y * cellSize + borderOffset.y), minCircleSize + ((maxCircleSize - minCircleSize) * bug.size), 0, 2 * Math.PI)
        ctx.fill()
      } catch (er) {}
    }
  }
  ctx.globalCompositeOperation = 'source-over'

  // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  //
  // Below is code that is common to all the projects, there may be some
  // customisation for animated work or special cases

  // Try various methods to tell the parent window that we've drawn something
  if (!thumbnailTaken) {
    try {
      $fx.preview()
    } catch (e) {
      try {
        fxpreview()
      } catch (e) {
      }
    }
    thumbnailTaken = true
  }

  // If we are forcing download, then do that now
  if (dumpOutputs || ('forceDownload' in urlParams && forceDownloaded === false)) {
    forceDownloaded = 'forceDownload' in urlParams
    await autoDownloadCanvas()
    // Tell the parent window that we have downloaded
    window.parent.postMessage('forceDownloaded', '*')
  } else {
    //  We should wait for the next animation frame here
    nextFrame = window.requestAnimationFrame(drawCanvas)
  }
  //
  // <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
}

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
//
// These are the common functions that are used by the canvas that we use
// across all the projects, init sets up the resize event and kicks off the
// layoutCanvas function.
//
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

//  Call this to start everything off
const init = async () => {
  // Resize the canvas when the window resizes, but only after 100ms of no resizing
  window.addEventListener('resize', async () => {
    //  If we do resize though, work out the new size...
    clearTimeout(resizeTmr)
    resizeTmr = setTimeout(async () => {
      await layoutCanvas()
    }, 100)
  })

  //  Now layout the canvas
  await layoutCanvas()
}

//  This is where we layout the canvas, and redraw the textures
const layoutCanvas = async (windowObj = window, urlParamsObj = urlParams) => {
  //  Kill the next animation frame (note, this isn't always used, only if we're animating)
  windowObj.cancelAnimationFrame(nextFrame)

  //  Get the window size, and devicePixelRatio
  const { innerWidth: wWidth, innerHeight: wHeight, devicePixelRatio = 1 } = windowObj
  let dpr = devicePixelRatio
  let cWidth = wWidth
  let cHeight = cWidth * ratio

  if (cHeight > wHeight) {
    cHeight = wHeight
    cWidth = wHeight / ratio
  }

  // Grab any canvas elements so we can delete them
  const canvases = document.getElementsByTagName('canvas')
  Array.from(canvases).forEach(canvas => canvas.remove())

  // Now set the target width and height
  let targetHeight = highRes ? 4096 : cHeight
  let targetWidth = targetHeight / ratio

  //  If the alba params are forcing the width, then use that (only relevant for Alba)
  if (windowObj.alba?.params?.width) {
    targetWidth = window.alba.params.width
    targetHeight = Math.floor(targetWidth * ratio)
  }

  // If *I* am forcing the width, then use that, and set the dpr to 1
  // (as we want to render at the exact size)
  if ('forceWidth' in urlParams) {
    targetWidth = parseInt(urlParams.forceWidth)
    targetHeight = Math.floor(targetWidth * ratio)
    dpr = 1
  }

  // Update based on the dpr
  targetWidth *= dpr
  targetHeight *= dpr

  //  Set the canvas width and height
  const canvas = document.createElement('canvas')
  canvas.id = 'target'
  canvas.width = targetWidth
  canvas.height = targetHeight
  document.body.appendChild(canvas)

  canvas.style.position = 'absolute'
  canvas.style.width = `${cWidth}px`
  canvas.style.height = `${cHeight}px`
  canvas.style.left = `${(wWidth - cWidth) / 2}px`
  canvas.style.top = `${(wHeight - cHeight) / 2}px`

  // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  //
  // Custom code (for defining textures and buffer canvas goes here) if needed
  //

  //  Re-Create the paper pattern
  const paper1 = document.createElement('canvas')
  paper1.width = canvas.width / 2
  paper1.height = canvas.height / 2
  const paper1Ctx = paper1.getContext('2d')
  await paper1Ctx.drawImage(paper1Loaded, 0, 0, 1920, 1920, 0, 0, paper1.width, paper1.height)
  features.paper1Pattern = paper1Ctx.createPattern(paper1, 'repeat')

  const paper2 = document.createElement('canvas')
  paper2.width = canvas.width / (22 / 7)
  paper2.height = canvas.height / (22 / 7)
  const paper2Ctx = paper2.getContext('2d')
  await paper2Ctx.drawImage(paper1Loaded, 0, 0, 1920, 1920, 0, 0, paper2.width, paper2.height)
  features.paper2Pattern = paper2Ctx.createPattern(paper2, 'repeat')

  drawCanvas()
}

//  This allows us to download the canvas as a PNG
// If we are forcing the id then we add that to the filename
const autoDownloadCanvas = async () => {
  const canvas = document.getElementById('target')

  // Create a download link
  const element = document.createElement('a')
  const filename = 'forceId' in urlParams
    ? `${prefix}_${urlParams.forceId.toString().padStart(4, '0')}_${fxhash}`
    : `${prefix}_${fxhash}`
  element.setAttribute('download', filename)

  // Hide the link element
  element.style.display = 'none'
  document.body.appendChild(element)

  // Convert canvas to Blob and set it as the link's href
  const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  element.setAttribute('href', window.URL.createObjectURL(imageBlob))

  // Trigger the download
  element.click()

  // Clean up by removing the link element
  document.body.removeChild(element)

  // Reload the page if dumpOutputs is true
  if (dumpOutputs) {
    window.location.reload()
  }
}
//  KEY PRESSED OF DOOM
document.addEventListener('keypress', async (e) => {
  e = e || window.event
  // == Common controls ==
  // Save
  if (e.key === 's') autoDownloadCanvas()

  //   Toggle highres mode
  if (e.key === 'h') {
    highRes = !highRes
    console.log('Highres mode is now', highRes)
    await layoutCanvas()
  }

  // Custom controls
})

//  This preloads the images so we can get access to them
// eslint-disable-next-line no-unused-vars
const preloadImages = () => {
  //  If paper1 has loaded and we haven't draw anything yet, then kick it all off
  if (paper1Loaded !== null && !drawStarted) {
    clearInterval(preloadImagesTmr)
    init()
  }

  //  If, for some reason things haven't fired after 3.333 seconds, then just draw the stuff anyway
  //  without the textures
  if (new Date().getTime() - startTime > 3333 && !drawStarted) {
    clearInterval(preloadImagesTmr)
    init()
  }
}
