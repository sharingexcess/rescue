import React, { memo, useEffect, useState } from 'react'
import { useDocumentData } from 'react-firebase-hooks/firestore'
import Loading from '../Loading/Loading'
import { useParams } from 'react-router-dom'
import UserIcon from '../../assets/user.svg'
import { getCollection } from '../../helpers/helpers'
import {
  UserPronouns,
  UserPhone,
  UserEmail,
  UserAdminPermissions,
  handleUserIcon,
  checkUserAdminPermissions,
} from './utils'
import { GoBack } from '../../helpers/components'
import './User.scss'

function User() {
  // get the user id from the current url parameters
  const { id } = useParams()
  // get that users profile from the users collection in firestore
  const [profile = {}, loading] = useDocumentData(
    getCollection('Users').doc(id)
  )
  // profileIconFullUrl will be used to store the full path URL to the user's profile photo
  const [profileIconFullUrl, setProfileIconFullUrl] = useState()
  // isAdmin defines whether the user being viewed has admin permissions
  const [isAdmin, setIsAdmin] = useState()

  useEffect(() => {
    // check is user is an admin on load
    checkUserAdminPermissions(id, setIsAdmin)
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // handle loading full image url when profile.icon changes
    handleUserIcon(profile.icon, setProfileIconFullUrl)
  }, [profile.icon])

  if (loading) return <Loading text="Loading user" />
  return (
    <main id="User">
      <GoBack url="/admin/users" label="back to users" />
      <div>
        <img
          src={profileIconFullUrl || profile.icon || UserIcon}
          id="org-icon"
          alt={profile.name}
        />
        <div>
          <h1>{profile.name}</h1>
          <UserPronouns profile={profile} />
          <UserPhone profile={profile} />
          <UserEmail profile={profile} />
        </div>
      </div>
      <UserAdminPermissions id={id} isAdmin={isAdmin} />
    </main>
  )
}

export default memo(User)