const {v1: uuid} = require("uuid")
const {PubSub} = require('graphql-subscriptions')
const pubsub = new PubSub();
const Author = require("./models/author")
const Book = require("./models/book")
const User = require('./models/user')
const { GraphQLError } = require('graphql')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

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
      // allAuthors: async () => await Author.find({})
      allAuthors: async () => {
        try {
          const authors = await Author.find({});
          console.log('Authors:', authors);
          return authors;
        } catch (error) {
          console.log('Error fetching authors:', error);
          throw error;
        }
      },
      
  
      me: async(root, args, {currentUser}) => {
        return currentUser
      },
  
      filterByGenre: async(root, args) => {
        if(!args.genres){
          return null
        }
        try{
          // return await Book.find({genres: [{$exists: args.genres}]})
          return await Book.find({genres: {$in: args.genres}})
        } catch (error){
          throw new GraphQLError('Error filtering books', {
            extensions: {
              code: 'INTERNAL_SERVER_ERROR',
              error
            }
          })
        }
      }, 
  
      allBooksByFavouriteGenre: async(root, args, {currentUser}) => {
        if(!currentUser){
          throw new GraphQLError('Not authenticated', {
            extensions: {
              code: 'LOGIN_FIRST',
            }
          })
        }
        return await Book.find({genres: {$in: currentUser.favouriteGenre}})
      }
  
    },
  
    Mutation: {
  
      addBook: async (root, args, context) => {
        const { title, author, published, genres } = args;
  
        const book = new Book({ title, published, genres });
        const currentUser = context.currentUser
  
        if(!currentUser){
          throw new GraphQLError('not authenticated', {
            extensions: {
              code: 'BAD_USER_INPUT',
            }
          })
        }
    
        try {
          // Find or create the author
          let existingAuthor = await Author.findOne({ name: author });
          if (!existingAuthor) {
            existingAuthor = new Author({ name: author });
            await existingAuthor.save();
          }
    
          // Update the author field of the book with the author's ObjectId
          book.author = existingAuthor._id;

          await book.save();
          
          pubsub.publish('BOOK_ADDED', {bookAdded: book})

          return book; 
        } catch (error) {
          console.error('Error while saving book:', error);
          throw new GraphQLError('Failed to save book', null, error);
        }
      },
  
      editAuthor: async (root, args, {currentUser}) => {
        const author = await Author.findOne({name: args.name})
        console.log(currentUser)
        if(!currentUser){
          throw new GraphQLError('not authenticated', {
            extensions: 'BAD_USER_REQUEST',
          })
        }
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
      },
  
      createUser: async (root, args) =>{
        const user = new User()
        user.username = args.username
        user.favouriteGenre = args.favouriteGenre
        user.password = await bcrypt.hash(args.password, 10)
        return user.save()
      },
  
      login: async (root, args) => {
        const user = await User.findOne({username: args.username})
        if(!user){
          throw new GraphQLError("No user found", {
            extensions: {
              code: 'BAD_USER_INPUT',
              invalidArgs: args.username,
            }
          })
        }
        const isValid = await bcrypt.compare(args.password, user.password)
        if(!isValid){
          throw new GraphQLError("Incorrect password", {
            extensions: {
              code: 'BAD_USER_INPUT',
              invalidArgs: args.password,
              error
            }
          })
        }
        const userToken = {
          username : args.username,
          id: user._id,
        }
        return {value: jwt.sign(userToken, process.env.SECRET, {expiresIn: "1d"})}
      }
    },

    // Subscritions 

    Subscription: {
        bookAdded: {
            subscribe: () => pubsub.asyncIterator('BOOK_ADDED')
        },
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
    },
  
}

module.exports = resolvers