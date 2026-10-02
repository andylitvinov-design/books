'use client'

export function ClientAccessDangerActions({ rotateAction, revokeAction, copy }) {
  const confirmAction = (message) => (event) => {
    if (!window.confirm(message)) event.preventDefault()
  }

  return <>
    <form action={rotateAction} onSubmit={confirmAction(copy.rotateConfirm)}><button>{copy.rotate}</button></form>
    <form action={revokeAction} onSubmit={confirmAction(copy.revokeConfirm)}><button>{copy.revoke}</button></form>
  </>
}
