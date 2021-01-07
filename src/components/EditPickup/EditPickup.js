import React, { memo, useEffect, useState } from 'react'
import { Input } from '../Input/Input'
import { updateFieldSuggestions, formFields } from './utils'
import './EditPickup.scss'

function EditPickup({ handleSubmit }) {
  const [formData, setFormData] = useState({
    // Any field used as an input value must be an empty string
    // others can and should be initialized as null
    org_name: '',
    org_id: null,
    location_id: '',
  })
  const [suggestions, setSuggestions] = useState({
    // these will populate the dropdown suggestions for each input
    org_name: [],
    org_id: [],
    location_id: [],
  })

  useEffect(() => {
    if (formData.org_id && formData.location_id) {
      handleSubmit(formData)
    }
  }, [formData, handleSubmit])

  function handleChange(e, field) {
    if (field.suggestionQuery) {
      updateFieldSuggestions(e.target.value, field, suggestions, setSuggestions)
    }
    setFormData({ ...formData, [e.target.id]: e.target.value })
  }

  function handleSelect(e, selected, field) {
    if (field.type !== 'select') {
      setSuggestions({ ...suggestions, [field.id]: null })
    }
    const updated_fields = field.handleSelect(selected)
    updated_fields && setFormData({ ...formData, ...updated_fields })
  }

  function renderFieldInput(field) {
    if (!field.preReq || formData[field.preReq]) {
      if (field.loadSuggestionsOnInit && !formData[field.id]) {
        updateFieldSuggestions(
          formData[field.preReq],
          field,
          suggestions,
          setSuggestions
        )
      }

      function handleDropdownSelect(e) {
        handleSelect(
          e,
          suggestions[field.id].find(s => s.id === e.target.value),
          field
        )
      }

      return (
        <Input
          key={field.id}
          element_id={field.id}
          type={field.type}
          label={field.label}
          value={formData[field.id]}
          onChange={e => handleChange(e, field)}
          suggestions={suggestions[field.id]}
          onSuggestionClick={
            field.type === 'select'
              ? handleDropdownSelect
              : (e, s) => handleSelect(e, s, field)
          }
        />
      )
    }
  }

  return (
    <div id="EditPickup">
      <h3>Add a Pickup</h3>
      {formFields.map(f => renderFieldInput(f))}
    </div>
  )
}

export default memo(EditPickup)
