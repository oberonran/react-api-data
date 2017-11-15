# react-api-data

Automate calling external APIs and handling response data. Supports any API with JSON responses. Uses Fetch for
performing API requests, normalizr for handling response data and redux for storing data.

## Installation

`npm install react-api-data`

or

`yarn add react-api-data`

Make sure *fetch* is available globally, polyfill it if needed to support older environments.

## Quick usage

### Config

```js
import { schema } from 'normalizr';
import { createStore, applyMiddleware, combineReducers } from 'redux'
import { configureApiData, reducer } from 'react-api-data';
import thunk from 'redux-thunk'

// define normalizr response schemas

const authorSchema = new schema.Entity('Author')
const articleSchema = new schema.Entity('Article', {
    author: authorSchema
})

// define api endpoints

const endpointConfig = {
    getArticle: {
        url: 'http://www.mocky.io/v2/5a0c203e320000772de9664c?:articleId/:userId',
        method: 'GET',
        responseSchema: articleSchema
    }
}

// Configure store and dispatch config before you render components

const store = createStore(combineReducers({apiData: reducer}), applyMiddleware(thunk));
store.dispatch(configureApiData({}, endpointConfig))
```

### Bind API data to your component

```js
import React from 'react'
import { withApiData } from 'react-api-data';

// bind api data to a component

const connectApiData = withApiData({
    // specify property name and endpoint
    article: 'getArticle'
}, (ownProps, state) => ({
    // provide URL parameters
    article: {articleId: ownProps.articleId, userId: state.userId || ''}
}));

const Article = (props) => {
    switch(props.article.request.networkStatus) {
        case 'loading': return 'Loading...';
        case 'failed': return 'Something went wrong :(';
        case 'success': {
            const article = props.article.data;
            return (
                <div>
                    <h1>{article.title}</h1>
                    <em>{article.author.name}</em><br />
                    {article.body}
                </div>
            );
        }
        default: return null;
    }
};

export default connectApiData(Article);

```