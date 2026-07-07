using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;

namespace REVORA_MVC_FE.Controllers
{
    [Route("api-proxy")]
    [ApiController]
    public class ProxyController : ControllerBase
    {
        private readonly HttpClient _httpClient;

        public ProxyController(IHttpClientFactory httpClientFactory)
        {
            _httpClient = httpClientFactory.CreateClient("ApiClient");
        }

        [Route("{**catchAll}")]
        public async Task<IActionResult> HandleProxy(string catchAll)
        {
            var targetUrl = $"https://localhost:7015/api/v1/{catchAll}{Request.QueryString}";

            var requestMessage = new HttpRequestMessage();
            requestMessage.RequestUri = new Uri(targetUrl);
            requestMessage.Method = new HttpMethod(Request.Method);

            // Copy Authorization header
            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
            {
                requestMessage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", authHeader.Substring(7));
            }

            // Copy Content
            if (Request.Method != HttpMethods.Get && Request.Method != HttpMethods.Head && Request.Method != HttpMethods.Delete && Request.Method != HttpMethods.Trace)
            {
                requestMessage.Content = new StreamContent(Request.Body);
                if (Request.ContentType != null)
                {
                    requestMessage.Content.Headers.ContentType = MediaTypeHeaderValue.Parse(Request.ContentType);
                }
            }

            try
            {
                var responseMessage = await _httpClient.SendAsync(requestMessage, HttpCompletionOption.ResponseHeadersRead);

                Response.StatusCode = (int)responseMessage.StatusCode;
                
                if (responseMessage.Content.Headers.ContentType != null)
                {
                    Response.ContentType = responseMessage.Content.Headers.ContentType.ToString();
                }

                await responseMessage.Content.CopyToAsync(Response.Body);
                return new EmptyResult();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
