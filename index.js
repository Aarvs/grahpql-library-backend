const { ApolloServer } = require('@apollo/server')
const { startStandaloneServer } = require('@apollo/server/standalone')
const {v1: uuid} = require("uuid")
const Author = require("./models/author")
const Book = require("./models/book")
const mongoose = require("mongoose")
const { GraphQLError } = require('graphql')
require('dotenv').config()

mongoose.set('strictQuery', false)

const MONGODB_URI = process.env.MONGODB_URI

console.log('connecting to', MONGODB_URI)

mongoose.connect(MONGODB_URI)  
  .then(() => {
    console.log('connected to MongoDB')
  })
  .catch((error) => {
    console.log('error connecting to MongoDB:', error.message)
  })

let authors = [
  {
    name: 'Robert Martin',
    id: "afa51ab0-344d-11e9-a414-719c6709cf3e",
    born: 1952,
  },
  {
    name: 'Martin Fowler',
    id: "afa5b6f0-344d-11e9-a414-719c6709cf3e",
    born: 1963
  },
  {
    name: 'Fyodor Dostoevsky',
    id: "afa5b6f1-344d-11e9-a414-719c6709cf3e",
    born: 1821
  },
  { 
    name: 'Joshua Kerievsky', // birthyear not known
    id: "afa5b6f2-344d-11e9-a414-719c6709cf3e",
    born: 1964
  },
  { 
    name: 'Sandi Metz', // birthyear not known
    id: "afa5b6f3-344d-11e9-a414-719c6709cf3e",
    born: 1899
  },
]

let books = [
  {
    title: 'Clean Code',
    published: 2008,
    author: 'Robert Martin',
    id: "afa5b6f4-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring']
  },
  {
    title: 'Agile software development',
    published: 2002,
    author: 'Robert Martin',
    id: "afa5b6f5-344d-11e9-a414-719c6709cf3e",
    genres: ['agile', 'patterns', 'design']
  },
  {
    title: 'Refactoring, edition 2',
    published: 2018,
    author: 'Martin Fowler',
    id: "afa5de00-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring']
  },
  {
    title: 'Refactoring to patterns',
    published: 2008,
    author: 'Joshua Kerievsky',
    id: "afa5de01-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring', 'patterns']
  },  
  {
    title: 'Practical Object-Oriented Design, An Agile Primer Using Ruby',
    published: 2012,
    author: 'Sandi Metz',
    id: "afa5de02-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring', 'design']
  },
  {
    title: 'Crime and punishment',
    published: 1866,
    author: 'Fyodor Dostoevsky',
    id: "afa5de03-344d-11e9-a414-719c6709cf3e",
    genres: ['classic', 'crime']
  },
  {
    title: 'The Demon ',
    published: 1872,
    author: 'Fyodor Dostoevsky',
    id: "afa5de04-344d-11e9-a414-719c6709cf3e",
    genres: ['classic', 'revolution']
  },
]

const typeDefs = `

  type Book {
    title: String!
    author: Author
    published: Int!
    genres: [String!]!
  }

  type Author {
    name: String!
    id: ID!
    born: Int
    bookCount: Int!
  }

  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genres: String): [Book]!
    allAuthors: [Author]!
  }

  type Mutation {
    addBook(
      title: String!
      author: String!
      published: Int!
      genres: [String]
    ): Book!
    
    editAuthor(
      name: String!
      setBornTo: Int!
    ): Author
  }
`
const resolvers = {
  Query: {
    bookCount: () => Book.collection.countDocuments(),
    authorCount: () => Author.collection.countDocuments(),
    allBooks: async (root, args) => {
      if(args.author && args.genres){
        Book.find({author: {$exists: args.author}, genres: [{$exists: args.genres}] })
      }else if(args.author && !args.genres){
        Book.find({author: {$exists: args.author}})
      }else if(args.genres && !args.author){
        Book.find({genres: [{$exists: args.genres}]})
      }else{
        return Book.find({})
      }
    },
    allAuthors: async () => await Author.find({}),

  },

  Mutation: {

    addBook: async (root, args) => {
      const { title, author, published, genres } = args;
  
      try {
        const book = new Book({ title, published, genres });
        
        // Find or create the author
        let existingAuthor = await Author.findOne({ name: author });
        if (!existingAuthor) {
          existingAuthor = new Author({ name: author });
          await existingAuthor.save();
        }
  
        // Update the author field of the book with the author's ObjectId
        book.author = existingAuthor._id;
  
        await book.save();
  
        return book; 
      } catch (error) {
        console.error('Error while saving book:', error);
        throw new GraphQLError('Failed to save book', null, error);
      }
    },

    editAuthor: async (root, args) => {
      const author = await Author.findOne({name: args.name})
      author.born = args.setBornTo
      console.log(author)
      if(!author){
        return null
      }
      // const updatedAuthor = {...author, born: args.setBornTo}
      // authors = authors.map(a => a.name === args.name ? updatedAuthor : a)
      try{
        await author.save()
      } catch (error) {
        throw new GraphQLError('Editing author failed', {
          extensions: {
            code: 'BAD_USER_INPUT',
            invalidArgs: args.setBornTo,
            error
          }
        })
      }
      return author
    }
  },

  Author: {
    bookCount: async (root) => await Book.find({author: root._id}).countDocuments()
  },

  Book: {
    author: async (root) => {
      if(!root.author){
        return null
      }
      return await Author.findOne({_id: root.author})
    }
  }

}

const server = new ApolloServer({
  typeDefs,
  resolvers,
})

startStandaloneServer(server, {
  listen: { port: 4000 },
}).then(({ url }) => {
  console.log(`Server ready at ${url}`)
})