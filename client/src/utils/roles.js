const ROLE_HOME_PATHS = {
  customer: '/customer',
  admin: '/admin',
}

function roleHomePath(role) {
  return ROLE_HOME_PATHS[role] || '/customer'
}

export { roleHomePath }
