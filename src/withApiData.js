// @flow

import React from 'react';
import type { ApiDataBinding, EndpointParams } from './index';
import { connect } from 'react-redux';
import { getApiDataRequest, getResultData, performApiRequest } from './reducer';
import hoistNonReactStatic from 'hoist-non-react-statics';
import type { ApiDataState } from '../src/reducer';
import shallowEqual from 'shallowequal';

type GetParams = (ownProps: Object, state: Object) => {[paramName: string]: EndpointParams}

type WithApiDataParams = {[paramName: string]: EndpointParams}

type WithApiDataProps = {
    apiData: ApiDataState,
    params: WithApiDataParams,
    dispatch: Function,
}

/**
 * Binds api data to component props and automatically triggers loading of data if it hasn't been loaded yet. The wrapped
 * component will get an ApiDataBinding added to each property key of the bindings param.
 * @param bindings - maps prop names to endpoint keys
 * @param [getParams] - optionally provide the params of the endpoint
 * @returns {Function} - Function to wrap your component
 * @example
 * withApiData({
 *    wishList: 'getWishLists',
 *    settings: 'getSettings'
 *  }, (ownProps, state) => ({
 *    wishList: {
 *      projectSlug: ownProps.match.params.projectSlug,
 *      env: ownProps.match.params.env
 *    },
 *    settings: {
 *      projectSlug: ownProps.match.params.projectSlug,
 *      env: ownProps.match.params.env
 *    }
 *  }))
 */
export default function withApiData (bindings: {[propName: string]: string}, getParams?: GetParams) {
    return function (WrappedComponent: any) {
        class WithApiData extends React.Component<WithApiDataProps> {
            static displayName = `WithApiData(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`

            componentDidMount () {
                this.fetchDataIfNeeded();
            }

            componentWillReceiveProps (newProps: WithApiDataProps) {
                // automatically fetch when parameters change or re-fetch when a request gets invalidated
                const keyParamsHaveChanged = bindingKey => !shallowEqual(newProps.params[bindingKey], this.props.params[bindingKey]);
                const getRequest = (props, bindingKey) => getApiDataRequest(props.apiData, bindings[bindingKey], props.params[bindingKey]);
                const hasBeenInvalidated = (oldRequest, newRequest) =>
                    !!oldRequest && oldRequest.networkStatus !== 'ready' && !!newRequest && newRequest.networkStatus === 'ready';
                const apiDataChanged = newProps.apiData !== this.props.apiData;

                Object.keys(bindings).forEach(bindingKey => {
                    if (keyParamsHaveChanged(bindingKey) || (apiDataChanged && hasBeenInvalidated(getRequest(this.props, bindingKey), getRequest(newProps, bindingKey)))) {
                        this.props.dispatch(performApiRequest(bindings[bindingKey], newProps.params[bindingKey]));
                    }
                });
            }

            fetchDataIfNeeded () {
                const { params, dispatch } = this.props;

                Object.keys(bindings).forEach(propName => {
                    const endpointKey = bindings[propName];

                    // performApiRequest will check if fetch is needed
                    dispatch(performApiRequest(endpointKey, params[propName]));
                });
            }

            render () {
                const { apiData, params, dispatch, ...componentProps } = this.props;
                const props = {
                    ...componentProps
                };
                Object.keys(bindings).forEach(propName => {
                    const endpointKey = bindings[propName];
                    props[propName] = ({
                        data: getResultData(apiData, endpointKey, params[propName]),
                        request: getApiDataRequest(apiData, endpointKey, params[propName]) || {
                            networkStatus: 'ready',
                            lastCall: 0,
                            duration: 0,
                            endpointKey,
                        }
                    }: ApiDataBinding<*>);
                });
                return <WrappedComponent {...props} />;
            }
        }

        hoistNonReactStatic(WithApiData, WrappedComponent); // move static methods to wrapper

        return connect((state: {apiData: ApiDataState}, ownProps: Object) => ({
            params: typeof getParams === 'function' ? getParams(ownProps, state) : {},
            apiData: state.apiData
        }))(WithApiData);
    };
}
