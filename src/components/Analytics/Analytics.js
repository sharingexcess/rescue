import React, { useEffect, useState } from 'react'
import useDeliveryData from '../../hooks/useDeliveryData'
import useRouteData from '../../hooks/useRouteData'
import useUserData from '../../hooks/useUserData'
import usePickupData from '../../hooks/usePickupData'
import {
  getDefaultRangeStart,
  getDefaultRangeEnd,
  sortByRoutes,
  capitalize,
  calculateAllWeights,
} from './utils'
import useOrganizationData from '../../hooks/useOrganizationData'
import Header from '../Header/Header'
import { Input } from '../Input/Input'
import './Analytics.scss'
import moment from 'moment'

export default function Analytics() {
  const [tab, setTab] = useState('RouteAnalytics')
  const [rangeStart, setRangeStart] = useState(getDefaultRangeStart())
  const [rangeEnd, setRangeEnd] = useState(getDefaultRangeEnd())
  const [driverNameFilter, setDriverNameFilter] = useState('')
  const orgs = useOrganizationData()
  const deliveries = useDeliveryData(r => r.status === 9 && r.report)
  const pickups = usePickupData(r => r.status === 9 && r.report)
  const driversOriginal = useUserData()
  const routesOriginal = useRouteData(r => r.status === 9)
  const [drivers, setDrivers] = useState(driversOriginal)
  const [routes, setRoutes] = useState(routesOriginal)

  useEffect(() => {
    if (driverNameFilter !== '') {
      setDrivers(
        driversOriginal.filter(dr =>
          dr.name.toLowerCase().includes(driverNameFilter.toLowerCase())
        )
      )
    } else {
      setDrivers(driversOriginal)
    }
  }, [driversOriginal, driverNameFilter])

  useEffect(() => {
    if (rangeStart && rangeEnd) {
      setRoutes(
        routesOriginal.filter(
          r =>
            new Date(r.time_start) > new Date(rangeStart) &&
            new Date(r.time_start) < new Date(rangeEnd)
        )
      )
    } else {
      setRoutes(routesOriginal)
    }
  }, [routesOriginal, rangeStart, rangeEnd])

  function sortByWeight(array) {
    return array.sort((a, b) =>
      calculateAllWeights(a, pickups, deliveries) >
      calculateAllWeights(b, pickups, deliveries)
        ? -1
        : 1
    )
  }

  function RouteAnalytics() {
    return (
      <table className="Styling">
        <thead>
          <tr>
            <td>Driver</td>
            <td>Timeline</td>
            <td>Pickups</td>
            <td>Deliveries</td>
            <td>Weight - Mileage</td>
          </tr>
        </thead>
        <tbody>
          {routes.map(r => {
            const r_driver = drivers.find(d => d.id === r.driver_id)
            if (!r_driver) {
              return null
            }
            const r_pickups = pickups.filter(p => p.route_id === r.id)
            const r_deliveries = deliveries.filter(de => de.route_id === r.id)
            const r_startday = r.time_start
            const r_starttime_array = r_pickups.map(p => p.time_finished)
            const r_starttime = r_starttime_array[0]
              ? r_starttime_array[0].toDate()
              : 'Not found'
            const r_endtime_array = r_deliveries.map(de => de.time_finished)
            const r_endtime = r_endtime_array[r_endtime_array.length - 1]
              ? r_endtime_array[r_endtime_array.length - 1].toDate()
              : 'Not found'
            const r_weight = r_deliveries
              .map(de => de.report.weight || 0)
              .reduce((a, b) => a + b, 0)
            return (
              <tr key={r.id}>
                <td id="driver">{r_driver.name}</td>
                <td id="timeline">
                  {moment(r_startday).format('MM-DD-YYYY')} <br></br>
                  {r_starttime === 'Not found'
                    ? r_starttime
                    : moment(r_starttime).format('h:mma')}{' '}
                  {' - '}
                  {r_endtime === 'Not found'
                    ? r_endtime
                    : moment(r_endtime).format('h:mma')}{' '}
                </td>
                <td>
                  <ul>
                    {r_pickups.map(p => (
                      <li>
                        {' - '}
                        {p.location_id
                          .split('_')
                          .map(p_name => capitalize(p_name) + ' ')}
                        ({p.report.weight} lbs)
                      </li>
                    ))}
                  </ul>
                </td>
                <td>
                  <ul>
                    {r_deliveries.map(de => (
                      <li>
                        {' - '}
                        {de.location_id
                          .split('_')
                          .map(de_name => capitalize(de_name) + ' ')}
                        ({de.report.weight} lbs)
                      </li>
                    ))}
                  </ul>
                </td>
                <td>{r_weight} lbs</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }

  function DriverAnalytics() {
    return (
      <table className="Styling">
        <thead>
          <tr>
            <td>Driver</td>
            <td>Routes</td>
            <td>Pickups</td>
            <td>Deliveries</td>
            <td>Total Weight</td>
          </tr>
        </thead>
        <tbody>
          {sortByRoutes(drivers, routes).map(dr => {
            const dr_routes = routes.filter(
              r => r.driver_id === dr.id && r.status === 9
            )
            const dr_pickups = pickups.filter(p =>
              dr_routes.map(r => r.id).includes(p.route_id)
            )
            const dr_deliveries = deliveries.filter(de =>
              dr_routes.map(r => r.id).includes(de.route_id)
            )
            const dr_weight = dr_deliveries
              .map(de => de.report.weight || 0)
              .reduce((a, b) => a + b, 0)
            return (
              <tr key={dr.id}>
                <td>{dr.name}</td>
                <td>{dr_routes.length}</td>
                <td>{dr_pickups.length}</td>
                <td>{dr_deliveries.length}</td>
                <td>{dr_weight}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }

  function OrgAnalytics() {
    const [filter, setFilter] = useState('all')

    function filterByType(orgs) {
      if (filter === 'donor') {
        return orgs.filter(o => o.org_type === 'donor')
      } else if (filter === 'recipient') {
        return orgs.filter(o => o.org_type === 'recipient')
      } else if (filter === 'community fridge') {
        return orgs.filter(o => o.org_type === 'community fridge')
      } else if (filter === 'warehouse') {
        return orgs.filter(o => o.org_type === 'warehouse')
      } else return orgs
    }
    return (
      <>
        <section id="Filters">
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="donor">Donors</option>
            <option value="recipient">Recipients</option>
            <option value="community fridge">Community Fridges</option>
            <option value="warehouse">Warehouse</option>
          </select>
        </section>
        <table className="Styling">
          <thead>
            <tr>
              <td>Organization</td>
              <td>Type</td>
              <td>Pickups</td>
              <td>Deliveries</td>
              <td>Total Weight</td>
            </tr>
          </thead>
          <tbody>
            {sortByWeight(filterByType(orgs)).map(org => {
              const org_pickups = pickups.filter(
                p => p.org_id === org.id && p.status === 9
              )
              const org_deliveries = deliveries.filter(
                de => de.org_id === org.id && de.status === 9
              )
              return (
                <tr key={org.id}>
                  <td>{org.name}</td>
                  <td>{org.org_type}</td>
                  <td>{org_pickups.length}</td>
                  <td>{org_deliveries.length}</td>
                  <td>{calculateAllWeights(org, pickups, deliveries)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </>
    )
  }

  function ActiveTab() {
    switch (tab) {
      case 'RouteAnalytics':
        return <RouteAnalytics />
      case 'DriverAnalytics':
        return <DriverAnalytics />
      case 'OrgAnalytics':
        return <OrgAnalytics />
      default:
        return null
    }
  }

  return (
    <main id="Analytics">
      <Header text="Analytics" />
      <section id="Tabs">
        <button
          className={tab === 'RouteAnalytics' ? 'active' : 'inactive'}
          onClick={() => setTab('RouteAnalytics')}
        >
          Routes
        </button>
        <button
          className={tab === 'DriverAnalytics' ? 'active' : 'inactive'}
          onClick={() => setTab('DriverAnalytics')}
        >
          Drivers
        </button>
        <button
          className={tab === 'OrgAnalytics' ? 'active' : 'inactive'}
          onClick={() => {
            setTab('OrgAnalytics')
          }}
        >
          Organizations
        </button>
      </section>

      {tab === 'RouteAnalytics' && (
        <section id="DateRanges">
          <h2>Filter by Date</h2>
          <Input
            type="datetime-local"
            label="From..."
            value={rangeStart}
            onChange={e => setRangeStart(e.target.value)}
          />
          <Input
            type="datetime-local"
            label="To..."
            value={rangeEnd}
            onChange={e => setRangeEnd(e.target.value)}
          />
        </section>
      )}
      {tab !== 'OrgAnalytics' && (
        <section id="DriverName">
          <h2>Filter by Driver</h2>
          <Input
            type="text"
            label="Driver's name"
            value={driverNameFilter}
            onChange={e => setDriverNameFilter(e.target.value)}
          />
        </section>
      )}
      <ActiveTab />
    </main>
  )
}
