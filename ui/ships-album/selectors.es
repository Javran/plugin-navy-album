import _ from 'lodash'
import {
  projectorToComparator,
  flipComparator,
} from 'subtender'
import { createSelector } from 'reselect'
import { constSelector } from 'views/utils/selectors'

import {
  uiSelector,
  shipsInfoSelector,
  sortByRemodelFuncSelector,
  indexedShipGraphInfoSelector,
  swfDatabaseSelector,
} from '../../selectors'

const shipAlbumSelector = createSelector(
  uiSelector,
  ui => ui.shipsAlbum)

const listOptionsSelector = createSelector(
  shipAlbumSelector,
  sa => sa.listOptions)

const isAbyssal = s => s.mstId > 1500

// "stage1" takes into account friendly / abyssal options
const shipsInfoStage1Selector = createSelector(
  shipsInfoSelector,
  listOptionsSelector,
  (shipsInfo, {showSides}) => {
    const {friendly, abyssal} = showSides
    // since there are only 4 cases,
    // let's take our time to consider all of them
    if (friendly && abyssal)
      return shipsInfo
    if (!friendly && !abyssal)
      return []

    // either friendly === true or abyssal === true
    return shipsInfo.filter(
      friendly ?
        s => !isAbyssal(s) :
        // otherwise it must be the case where
        isAbyssal
    )
  }
)

/*

   "stage2" takes into account "groupShipTypes":

   - true: returns an Object whose keys are stypes and values Array of ShipInfo.
   - false: returns an Array of ShipInfo - since there's nothing to be groupped in this stage.

 */
const shipsInfoStage2Selector = createSelector(
  shipsInfoStage1Selector,
  listOptionsSelector,
  (shipsInfo, {groupShipTypes}) =>
    groupShipTypes ?
      _.groupBy(shipsInfo, 'stype') :
      shipsInfo
)

/*
   stage3 takes into account ship remodel info:

   - when groupRemodels is true, "sortByRemodelFunc" is used to sort the array
   - otherwise simply use mstId to sort

 */
const shipsInfoStage3Selector = createSelector(
  shipsInfoStage2Selector,
  listOptionsSelector,
  constSelector,
  sortByRemodelFuncSelector,
  (
    shipsInfoObjOrArr,
    {groupRemodels},
    {$shipTypes},
    sortByRemodelFunc,
  ) => {
    // in-place sort should be fine, nothing except this
    // selector would take stage2 results.
    const sortArray =
      groupRemodels ?
        sortByRemodelFunc :
        xs => xs.sort(projectorToComparator(s => s.mstId))

    /*
       unify two different structures in stage2 to get the
       "wrappedShipsInfo" (Array), whose elements are one of the following:

       - {type: 'ship', info: <ShipInfo>}
       - {type: 'stype', typeName: <string>, stype: <number>}

     */
    let groupped
    let wrappedShipsInfo
    if (Array.isArray(shipsInfoObjOrArr)) {
      groupped = false
      wrappedShipsInfo = sortArray(shipsInfoObjOrArr).map(s =>
        ({type: 'ship', info: s}))
    } else {
      groupped = true
      // Array of [ stype(number), sorted ShipInfo ]
      const sortedShipsInfoGroups =
        _.toPairs(shipsInfoObjOrArr).map(([stypeStr, stypeShipsInfo]) =>
          [
            // convert stype back to number for sorting
            Number(stypeStr),
            // convert shipsInfo (of the same stype)
            sortArray(stypeShipsInfo),
          ]
        ).sort(
          // ship type are sorted numerically in descending order
          // which is to be consistent with the order in game.
          flipComparator(projectorToComparator(([stype]) => stype))
        )
      wrappedShipsInfo =
        _.flatMap(
          sortedShipsInfoGroups, ([stype, stypeShipsInfo]) => {
            const stypeItem = {
              type: 'stype',
              typeName: $shipTypes[stype].api_name,
              stype,
            }
            return [
              stypeItem,
              ...stypeShipsInfo.map(s =>
                ({type: 'ship', info: s})),
            ]
          })
    }
    return {groupped, wrappedShipsInfo}
  }
)

const shipsInfoSelectorForView = shipsInfoStage3Selector

const shipViewerSelector = createSelector(
  shipAlbumSelector,
  sa => sa.shipViewer
)

const mstIdSelector = createSelector(
  shipViewerSelector,
  sv => sv.mstId
)

const levelSelector = createSelector(
  shipViewerSelector,
  sv => sv.level
)

const shipGraphPathSelector = createSelector(
  indexedShipGraphInfoSelector,
  mstIdSelector,
  (indexedShipGraphInfo, mstId) => {
    const graphInfo = _.get(indexedShipGraphInfo,[mstId, 'graphInfo'])
    if (!graphInfo)
      return null
    const {fileName, versionStr} = graphInfo
    return `/kcs/resources/swf/ships/${fileName}.swf?VERSION=${versionStr}`
  }
)

const shipGraphSourcesSelector = createSelector(
  shipGraphPathSelector,
  swfDatabaseSelector,
  (shipGraphPath, swfDatabase) =>
    shipGraphPath ? _.get(swfDatabase.db,shipGraphPath,{}) : {}
)

const shipMasterDataSelector = createSelector(
  mstIdSelector,
  constSelector,
  (mstId, {$ships}) => $ships[mstId]
)

export {
  shipAlbumSelector,
  listOptionsSelector,
  shipsInfoSelectorForView,
  shipViewerSelector,
  mstIdSelector,
  levelSelector,
  shipGraphPathSelector,
  shipGraphSourcesSelector,
  shipMasterDataSelector,
}
