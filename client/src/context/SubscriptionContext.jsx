import React, { createContext, useContext, useState, useEffect } from 'react';

const SubscriptionContext = createContext();

export function useSubscription() {
  return useContext(SubscriptionContext);
}

export function SubscriptionProvider({ children }) {
  // Try to load initial state from sessionStorage
  // Try to load initial state (only user survives refresh)
  const getInitialState = () => {
    const savedUser = sessionStorage.getItem('subscriptionUser');
    return { 
      user: savedUser ? JSON.parse(savedUser) : null, 
      plan: null, 
      coupon: null 
    };
  };

  const [state, setState] = useState(getInitialState);

  // Save only user to sessionStorage whenever it changes
  useEffect(() => {
    if (state.user) {
      sessionStorage.setItem('subscriptionUser', JSON.stringify(state.user));
    } else {
      sessionStorage.removeItem('subscriptionUser');
    }
  }, [state.user]);

  const setUser = (user) => setState((prev) => ({ ...prev, user }));
  const setPlan = (plan) => setState((prev) => ({ ...prev, plan }));
  const setCoupon = (coupon) => setState((prev) => ({ ...prev, coupon }));
  
  const resetFlow = () => {
    const newState = { user: null, plan: null, coupon: null };
    setState(newState);
    sessionStorage.removeItem('subscriptionFlow');
  };

  // Keep user but clear flow selections (useful when user wants to restart flow or after successful subscription)
  const clearSelections = () => {
    setState((prev) => ({ ...prev, plan: null, coupon: null }));
  };

  return (
    <SubscriptionContext.Provider
      value={{
        ...state,
        setUser,
        setPlan,
        setCoupon,
        resetFlow,
        clearSelections
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}
