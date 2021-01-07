import React, { memo, useEffect, useState } from 'react'
import { Input } from '../Input/Input'
import Ellipsis, { GoBack } from '../../helpers/components'
import { useHistory } from 'react-router-dom'
import { createPickup, updateFieldSuggestions, formFields } from './utils'
import './EditRoute.scss'
import { useCollectionData } from 'react-firebase-hooks/firestore'
import UserIcon from '../../assets/user.svg'
import { getCollection } from '../../helpers/helpers'
import moment from 'moment'
import EditDelivery from '../EditDelivery/EditDelivery'
import { v4 as generateUniqueId } from 'uuid'
import EditPickup from '../EditPickup/EditPickup'
import firebase from 'firebase/app'

function EditRoute() {
  const history = useHistory()
  const [formData, setFormData] = useState({
    // Any field used as an input value must be an empty string
    // others can and should be initialized as null
    driver_name: '',
    driver_id: null,
    time_start: '',
    time_end: '',
    stops: [],
  })
  const [suggestions, setSuggestions] = useState({
    // these will populate the dropdown suggestions for each input
    driver_name: [],
    driver_id: [],
  })
  const [list, setList] = useState('pickups')
  const [working, setWorking] = useState()
  const [confirmedDriver, setConfirmedDriver] = useState()

  useEffect(() => {
    formData.driver_id &&
      getCollection('Users')
        .doc(formData.driver_id)
        .get()
        .then(res => {
          const driver = res.data()
          setFormData({ ...formData, driver })
        })
  }, [formData.driver_id])

  function handleAddPickup(pickup) {
    setList(false)
    const id = generateStopId(pickup)
    setFormData({
      ...formData,
      stops: [...formData.stops, { ...pickup, id, type: 'pickup' }],
    })
  }

  function handleAddDelivery(delivery) {
    setList(false)
    const id = generateStopId(delivery)
    setFormData({
      ...formData,
      stops: [...formData.stops, { ...delivery, id, type: 'delivery' }],
    })
  }

  async function handleCreateRoute() {
    setWorking(true)
    const route_id = await generateRouteId()
    if (route_id) {
      for (const [index, stop] of formData.stops.entries()) {
        if (stop.type === 'pickup') {
          await getCollection('Pickups').doc(stop.id).set(
            {
              id: stop.id,
              org_id: stop.org_id,
              location_id: stop.location_id,
              created_at: firebase.firestore.FieldValue.serverTimestamp(),
              updated_at: firebase.firestore.FieldValue.serverTimestamp(),
              report: {},
              status: 0,
              route_id,
            },
            { merge: true }
          )
        } else if (stop.type === 'delivery') {
          const pickup_ids = getPickupsInDelivery(index)
          await getCollection('Deliveries').doc(stop.id).set(
            {
              id: stop.id,
              org_id: stop.org_id,
              location_id: stop.location_id,
              created_at: firebase.firestore.FieldValue.serverTimestamp(),
              updated_at: firebase.firestore.FieldValue.serverTimestamp(),
              weight: 0,
              status: 0,
              pickup_ids,
              route_id,
            },
            { merge: true }
          )
        }
      }
      const event = {
        summary: `Food Rescue: ${formData.driver.name}`,
        location: `${formData.stops[0].location.address1}, ${formData.stops[0].location.city}, ${formData.stops[0].location.state} ${formData.stops[0].location.zip_code}`,
        description: `Stops on Route: ${formData.stops
          .map(s => s.org.name + ' (' + s.type + ')')
          .join(', ')}`,
        start: {
          dateTime: new Date(formData.time_start).toISOString(),
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: new Date(formData.time_end).toISOString(),
          timeZone: 'America/New_York',
        },
        attendees: [{ email: formData.driver.email }],
      }

      const request = window.gapi.client.calendar.events.insert({
        calendarId: 'rn2umgc8h8bmapgi0cr60agmsc@group.calendar.google.com',
        resource: event,
      })
      request.execute(event => {
        getCollection('Routes')
          .doc(route_id)
          .set({
            id: route_id,
            google_calendar_event_id: event.id,
            driver_id: formData.driver_id,
            time_start: formData.time_start,
            time_end: formData.time_end,
            stops: formData.stops.map(s => ({ id: s.id, type: s.type })),
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            updated_at: firebase.firestore.FieldValue.serverTimestamp(),
          })
          .then(() => history.push('/routes'))
      })
    }
  }

  async function generateRouteId() {
    const uniq_id = `${formData.driver.name}_${formData.time_start.toString()}`
      .replace(/[^A-Z0-9]/gi, '_')
      .toLowerCase()
    const exists = await getCollection('Routes')
      .doc(uniq_id)
      .get()
      .then(res => res.data())
    if (exists) {
      alert('This driver is already scheduled for a delivery at this time.')
      return null
    } else return uniq_id
  }

  function generateStopId(stop) {
    return `${stop.org.name}_${generateUniqueId()}`
      .replace(/[^A-Z0-9]/gi, '_')
      .toLowerCase()
  }

  function getPickupsInDelivery(index) {
    const sliced = formData.stops.slice(0, index)
    for (let i = index - 1; i >= 0; i--) {
      if (sliced[i].type === 'delivery') {
        if (sliced.slice(i + 1, sliced.length).length < 1) {
          // this is delivery shares pickups with another delivery, continue
          sliced.pop()
        } else return sliced.slice(i + 1, sliced.length).map(j => j.id)
      }
    }
    return sliced.map(j => j.id)
  }

  function handleRemoveStop(id) {
    setFormData({
      ...formData,
      stops: formData.stops.filter(s => s.id !== id),
    })
  }

  function isValidRoute() {
    if (
      formData.stops.find(s => s.type === 'pickup') &&
      formData.stops.find(s => s.type === 'delivery')
    ) {
      return true
    }
    return false
  }

  function handleChange(e, field) {
    if (field.suggestionQuery) {
      updateFieldSuggestions(e.target.value, field, suggestions, setSuggestions)
    }
    if (field.id === 'time_start') {
      // automatically set time end 2 hrs later
      const time_end = new Date(e.target.value)
      time_end.setTime(time_end.getTime() + 2 * 60 * 60 * 1000)
      setFormData({
        ...formData,
        [e.target.id]: e.target.value,
        time_end: moment(time_end).format('yyyy-MM-DDTHH:mm'),
      })
    } else setFormData({ ...formData, [e.target.id]: e.target.value })
  }

  function handleSelect(e, selected, field) {
    if (field.type !== 'select') {
      setSuggestions({ ...suggestions, [field.id]: null })
    }
    const updated_fields = field.handleSelect(selected)
    updated_fields && setFormData({ ...formData, ...updated_fields })
  }

  function Stop({ s }) {
    return (
      <div className={`Stop ${s.type}`}>
        <div>
          <i className="fa fa-times" onClick={() => handleRemoveStop(s.id)} />
          <h4>
            <i
              className={
                s.type === 'pickup' ? 'fa fa-arrow-up' : 'fa fa-arrow-down'
              }
            />
            {s.type}
          </h4>
          <h2>{s.org.name}</h2>
          <p>
            {s.location.address1}
            {s.location.address2 && ` - ${s.location.address2}`}
          </p>
          <p>
            {s.location.city}, {s.location.state} {s.location.zip_code}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div id="EditRoute">
      <GoBack label="back" url="/" />
      <h1>New Route</h1>
      {confirmedDriver ? (
        <div id="Driver">
          <img
            src={formData.driver.icon || UserIcon}
            alt={formData.driver.name}
          />
          <div>
            <h3>{formData.driver.name}</h3>
            <h4>{moment(formData.time_start).format('dddd, MMMM D')}</h4>
            <h5>
              {moment(formData.time_start).format('h:mma')} -{' '}
              {moment(formData.time_end).format('h:mma')}
            </h5>
          </div>
        </div>
      ) : (
        <>
          {formFields.map(field =>
            !field.preReq || formData[field.preReq] ? (
              <Input
                key={field.id}
                element_id={field.id}
                type={field.type}
                label={field.label}
                value={formData[field.id]}
                onChange={e => handleChange(e, field)}
                suggestions={suggestions[field.id]}
                onSuggestionClick={(e, s) => handleSelect(e, s, field)}
                animation={false}
              />
            ) : null
          )}
          {formData.time_end && (
            <button onClick={() => setConfirmedDriver(true)}>
              add pickups
            </button>
          )}
        </>
      )}
      {formData.stops.map(s => (
        <Stop s={s} key={s.id} />
      ))}
      {confirmedDriver ? (
        <>
          <section id="AddStop">
            {list === 'pickups' ? (
              <EditPickup handleSubmit={handleAddPickup} />
            ) : list === 'delivery' ? (
              <EditDelivery handleSubmit={handleAddDelivery} />
            ) : null}
          </section>
          <div className="add">
            {list ? (
              <button className="cancel" onClick={() => setList()}>
                cancel
              </button>
            ) : (
              <>
                <button className="pickup" onClick={() => setList('pickups')}>
                  add pickup
                </button>
                {formData.stops.length ? (
                  <button
                    className="delivery"
                    onClick={() => setList('delivery')}
                  >
                    add delivery
                  </button>
                ) : null}
                {isValidRoute() && (
                  <button
                    className="complete"
                    onClick={working ? null : handleCreateRoute}
                  >
                    {working ? (
                      <>
                        creating
                        <Ellipsis />
                      </>
                    ) : (
                      'complete route'
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

export default memo(EditRoute)
