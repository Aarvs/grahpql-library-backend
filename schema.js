const typeDefs = `
  type User{
    username: String!
    favouriteGenre: String!
    id: ID!
  }

  type Token{
    value: String!
  }

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
    me: User
    filterByGenre(genres: [String!]!): [Book]!
    allBooksByFavouriteGenre: [Book]!
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

    createUser(
      username: String!
      password: String!
      favouriteGenre: String!
    ): User

    login(
      username: String!
      password: String!
    ): Token
  }

  type Subscription {
    bookAdded: Book!
  }
`

module.exports = typeDefs