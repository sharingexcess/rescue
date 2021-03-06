export function generateDirectionsLink(addressObj) {
  const base_url = 'https://www.google.com/maps/dir/?api=1&destination='
  return `${base_url}${addressObj.address1}+${addressObj.city}+${addressObj.state}+${addressObj.zip_code}`
}

export function allFoodDelivered(stops) {
  if (stops.length === 0) {
    return false
  }
  let finalWeight = 0
  for (const stop of stops) {
    if (!stop.report) {
      return false
    }
    stop.type === 'pickup'
      ? (finalWeight += stop.report.weight)
      : (finalWeight -= stop.report.weight)
  }
  return finalWeight === 0
}

export function areAllStopsCompleted(stops) {
  let completed = true
  for (const s of stops) {
    // if stop is not completed or cancelled
    if (s.status === 1) {
      completed = false
      break
    }
  }
  return completed
}

export function isNextIncompleteStop(route, stops, index) {
  if (
    stops[index].status === 9 ||
    stops[index].status === 0 ||
    route.status < 3
  )
    return false
  return true
}

export function getDeliveryWeight(deliveries, route) {
  const myRoute = deliveries.find(r => r.route_id === route.id)
  return myRoute
    ? Math.round(
        myRoute.report?.weight /
          (myRoute.report?.percent_of_total_dropped / 100)
      )
    : 0
}
