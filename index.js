/* global preloadImagesTmr fxhash fxrand paper1Loaded noise */

//
//  fxhash - background paper
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

const ratio = 1
// const startTime = new Date().getTime() // so we can figure out how long since the scene started
let drawn = false
let highRes = false // display high or low res
const features = {}
const nextFrame = null
const NORTH = 0
const EAST = 1
const SOUTH = 2
const WEST = 3

window.$fxhashFeatures = {}

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

  features.maxLength = features.gridSize * (minLengthMod + Math.floor(gridPercent * (maxLengthMod - minLengthMod)))

  // features.gridSize = 28
  // features.maxLength = features.gridSize * 22

  //  Fill the grid
  for (let y = 0; y <= features.gridSize; y++) {
    for (let x = 0; x <= features.gridSize; x++) {
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
  let failed = false
  let ended = false
  let exitCount = 0
  let totalLength = 0

  while (failed === false && ended === false && exitCount < 100000) {
    //  we haven't failed yet!
    failed = false
    //  Grab the current position
    const currentPoint = features.line[features.line.length - 1]

    //  Record the walls used into the grid
    if (currentPoint.facing === NORTH && currentPoint.y <= features.gridSize) features.grid[`${currentPoint.x},${currentPoint.y}`].westWall = true
    if (currentPoint.facing === EAST && currentPoint.x <= features.gridSize) features.grid[`${currentPoint.x},${currentPoint.y}`].southWall = true
    if (currentPoint.facing === SOUTH && currentPoint.y - 1 >= 0) features.grid[`${currentPoint.x},${currentPoint.y - 1}`].westWall = true
    if (currentPoint.facing === WEST && currentPoint.x - 1 >= 0) features.grid[`${currentPoint.x - 1},${currentPoint.y}`].southWall = true

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
    if (newPoint.facing === NORTH && newPoint.y < features.gridSize && features.grid[`${newPoint.x},${newPoint.y + 1}`].westWall) chanceToTurn = 100
    if (newPoint.facing === EAST && newPoint.x < features.gridSize && features.grid[`${newPoint.x + 1},${newPoint.y}`].southWall) chanceToTurn = 100
    if (newPoint.facing === SOUTH && newPoint.y > 2 && features.grid[`${newPoint.x},${newPoint.y - 2}`].westWall) chanceToTurn = 100
    if (newPoint.facing === WEST && newPoint.x > 2 && features.grid[`${newPoint.x - 2},${newPoint.y}`].southWall) chanceToTurn = 100

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
        if (newPoint.x - 2 >= 0 && features.grid[`${newPoint.x - 2},${newPoint.y}`].southWall) canTurnWest = 0
        if (newPoint.x - 1 >= 0 && features.grid[`${newPoint.x - 1},${newPoint.y}`].southWall) canTurnWest = 0
        if (newPoint.x + 1 < features.gridSize && features.grid[`${newPoint.x + 1},${newPoint.y}`].southWall) canTurnEast = 0
        if (newPoint.x < features.gridSize && features.grid[`${newPoint.x},${newPoint.y}`].southWall) canTurnEast = 0
      }

      if (currentPoint.facing === EAST) {
        canTurnNorth = 1
        canTurnSouth = 1
        //  Check to see if we can actually turn north or south
        if (newPoint.y - 2 >= 0 && features.grid[`${newPoint.x},${newPoint.y - 2}`].westWall) canTurnSouth = 0
        if (newPoint.y - 1 >= 0 && features.grid[`${newPoint.x},${newPoint.y - 1}`].westWall) canTurnSouth = 0
        if (newPoint.y + 1 < features.gridSize && features.grid[`${newPoint.x},${newPoint.y + 1}`].westWall) canTurnNorth = 0
        if (newPoint.y < features.gridSize && features.grid[`${newPoint.x},${newPoint.y}`].westWall) canTurnNorth = 0
      }

      if (currentPoint.facing === SOUTH) {
        canTurnEast = 1
        canTurnWest = 1
        //  Check to see if we can actually turn east or west
        if (newPoint.x - 2 >= 0 && features.grid[`${newPoint.x - 2},${newPoint.y}`].southWall) canTurnWest = 0
        if (newPoint.x - 1 >= 0 && features.grid[`${newPoint.x - 1},${newPoint.y}`].southWall) canTurnWest = 0
        if (newPoint.x + 1 < features.gridSize && features.grid[`${newPoint.x + 1},${newPoint.y}`].southWall) canTurnEast = 0
        if (newPoint.x < features.gridSize && features.grid[`${newPoint.x},${newPoint.y}`].southWall) canTurnEast = 0
      }

      if (currentPoint.facing === WEST) {
        canTurnNorth = 1
        canTurnSouth = 1
        //  Check to see if we can actually turn north or south
        if (newPoint.y - 2 >= 0 && features.grid[`${newPoint.x},${newPoint.y - 2}`].westWall) canTurnSouth = 0
        if (newPoint.y - 1 >= 0 && features.grid[`${newPoint.x},${newPoint.y - 1}`].westWall) canTurnSouth = 0
        if (newPoint.y + 1 < features.gridSize && features.grid[`${newPoint.x},${newPoint.y + 1}`].westWall) canTurnNorth = 0
        if (newPoint.y < features.gridSize && features.grid[`${newPoint.x},${newPoint.y}`].westWall) canTurnNorth = 0
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
    if (newPoint.x === 0 && newPoint.facing === WEST) ended = true
    if (newPoint.x === features.gridSize - 1 && newPoint.facing === EAST) ended = true
    if (newPoint.y === 1 && newPoint.facing === SOUTH) ended = true // Special case, don't want to go back down to the start line
    if (newPoint.y === features.gridSize - 1 && newPoint.facing === NORTH) ended = true

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
      for (let y = 0; y <= features.gridSize; y++) {
        for (let x = 0; x <= features.gridSize; x++) {
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

    // const boxLines = []
    // const boxes = []

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
      for (let y = 0; y <= features.gridSize; y++) {
        for (let x = 0; x <= features.gridSize; x++) {
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
  console.log('exitCount: ', exitCount)
  console.log('totalLength: ', totalLength)
  console.log('features.maxLength: ', features.maxLength)
  console.log(features)
}

//  Call the above make features, so we'll have the window.$fxhashFeatures available
//  for fxhash
makeFeatures()
console.table(window.$fxhashFeatures)

const init = async () => {
  //  I should add a timer to this, but really how often to people who aren't
  //  the developer resize stuff all the time. Stick it in a digital frame and
  //  have done with it!
  window.addEventListener('resize', async () => {
    //  If we do resize though, work out the new size...
    await layoutCanvas()
    //  And redraw it
    drawCanvas()
  })

  //  Now layout the canvas
  await layoutCanvas()
  //  And draw it!!
  drawCanvas()
}

const layoutCanvas = async () => {
  //  Kill the next animation frame
  window.cancelAnimationFrame(nextFrame)

  const wWidth = window.innerWidth
  const wHeight = window.innerHeight
  let cWidth = wWidth
  let cHeight = cWidth * ratio
  if (cHeight > wHeight) {
    cHeight = wHeight
    cWidth = wHeight / ratio
  }
  const canvas = document.getElementById('target')
  if (highRes) {
    canvas.height = 8192
    canvas.width = 8192 / ratio
  } else {
    canvas.width = Math.min((8192 / 2), cWidth * 2)
    canvas.height = Math.min((8192 / ratio / 2), cHeight * 2)
    //  Minimum size to be half of the high rez cersion
    if (Math.min(canvas.width, canvas.height) < 8192 / 2) {
      if (canvas.width < canvas.height) {
        canvas.height = 8192 / 2
        canvas.width = 8192 / 2 / ratio
      } else {
        canvas.width = 8192 / 2
        canvas.height = 8192 / 2 / ratio
      }
    }
  }

  canvas.style.position = 'absolute'
  canvas.style.width = `${cWidth}px`
  canvas.style.height = `${cHeight}px`
  canvas.style.left = `${(wWidth - cWidth) / 2}px`
  canvas.style.top = `${(wHeight - cHeight) / 2}px`

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

const drawCanvas = async () => {
  //  Let the preloader know that we've hit this function at least once
  drawn = true
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
  }

  //  Now do it all over again
  // nextFrame = window.requestAnimationFrame(drawCanvas)
}

const autoDownloadCanvas = async (showHash = false) => {
  const element = document.createElement('a')
  element.setAttribute('download', `are_friends_electric_${fxhash}`)
  element.style.display = 'none'
  document.body.appendChild(element)
  let imageBlob = null
  imageBlob = await new Promise(resolve => document.getElementById('target').toBlob(resolve, 'image/png'))
  element.setAttribute('href', window.URL.createObjectURL(imageBlob, {
    type: 'image/png'
  }))
  element.click()
  document.body.removeChild(element)
}

//  KEY PRESSED OF DOOM
document.addEventListener('keypress', async (e) => {
  e = e || window.event
  // Save
  if (e.key === 's') autoDownloadCanvas()

  //   Toggle highres mode
  if (e.key === 'h') {
    highRes = !highRes
    await layoutCanvas()
  }
})
//  This preloads the images so we can get access to them
// eslint-disable-next-line no-unused-vars
const preloadImages = () => {
  //  If paper1 has loaded and we haven't draw anything yet, then kick it all off
  if (paper1Loaded !== null && !drawn) {
    clearInterval(preloadImagesTmr)
    init()
  }
}
