exports.handler = async (event, context) => {
  // You can access event.body and handle signup logic here
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Google signup endpoint reached" }),
  };
};
